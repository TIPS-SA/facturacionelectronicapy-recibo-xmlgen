import * as xml2js from 'xml2js';

import stringUtilService from './StringUtil.service';
import fechaUtilService from './FechaUtil.service';
import constanteService from './constante.service';
import jsonDteAlgoritmos from './reciboXmlAlgoritmos.service';
import reciboXmlTotales from './reciboXmlTotales.service';
import jsonDteIdentificacionDocumento from './JsonReciboDocumentoAsociado.service';
import jsonDeMainValidate from './JsonReciboValidate.service';
import { XmlgenConfig } from './type.interface.';

class ReciboXmlMainService {
  codigoSeguridad: any = null;
  codigoControl: any = null;
  json: any = {};
  validateError = true;

  public generateReciboXMLDE(params: any, data: any, config?: XmlgenConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let defaultConfig: XmlgenConfig = {
          defaultValues: true,
          //arrayValuesSeparator : ', ',
          errorSeparator: '; ',
          errorLimit: 10,
          redondeoSedeco: true,
          decimals: 2,
        };

        defaultConfig = Object.assign(defaultConfig, config);

        resolve(this.generateXMLReciboService(params, data, defaultConfig));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Metodo principal de generacion de XML del DE
   * @param params
   * @param data
   * @returns
   */
  private generateXMLReciboService(params: any, data: any, config: XmlgenConfig) {
    this.removeUnderscoreAndPutCamelCase(data);

    this.addDefaultValues(data);

    if (this.validateError) {
      jsonDeMainValidate.validateValues({ ...params }, { ...data }, config);
    }

    this.json = {};

    this.generateCodigoControlRecibo(params, data); //Luego genera el código de Control

    this.generateRte(params);

    this.json['rDE']['recibo'] = this.generateRecibo(params, data);
    //---
    this.generateDatosOperacion(params, data);
    this.generateDatosTimbrado(params, data);
    this.generateDatosGenerales(params, data, config);
    //---

    //this.generateDatosCondicionOperacionDE(params, data);

    
    this.json['rDE']['recibo']['gTotSub'] = reciboXmlTotales.generateDatosTotalesRecibo(params, data, config);  //Marcos
    

    
    if (data['documentosAsociados']) {
      this.json['rDE']['recibo']['gCamDEAsoc'] = jsonDteIdentificacionDocumento.generateDocumentosAsociados(
        params,
        data,
      );
    }
  
    var builder = new xml2js.Builder({
      xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: false,
      },
    });
    var xml = builder.buildObject(this.json);

    return this.normalizeXML(xml); //Para firmar tiene que estar normalizado
  }

  /**
   * Genera el CDC para la Factura
   * Corresponde al Id del DE
   *
   * @param params
   * @param data
   */
  generateCodigoControlRecibo(params: any, data: any) {
    if (data.cdc && (data.cdc + '').length == 44) {
      //Caso ya se le pase el CDC
      this.codigoSeguridad = data.cdc.substring(34, 43);
      this.codigoControl = data.cdc;

      //Como se va utilizar el CDC enviado como parametro, va a verificar que todos los datos del XML coincidan con el CDC.
      const tipoDocumentoCDC = this.codigoControl.substring(0, 2);
      //const rucCDC = this.codigoControl.substring(2, 10);
      //const dvCDC = this.codigoControl.substring(10, 11);
      const establecimientoCDC = this.codigoControl.substring(11, 14);
      const puntoCDC = this.codigoControl.substring(14, 17);
      const numeroCDC = this.codigoControl.substring(17, 24);
      //const tipoContribuyenteCDC = this.codigoControl.substring(24, 25);
      const fechaCDC = this.codigoControl.substring(25, 33);
      const tipoEmisionCDC = this.codigoControl.substring(33, 34);

      const establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);

      const punto = stringUtilService.leftZero(data['punto'], 3);

      const numero = stringUtilService.leftZero(data['numero'], 7);

      const fecha =
        (data['fecha'] + '').substring(0, 4) +
        (data['fecha'] + '').substring(5, 7) +
        (data['fecha'] + '').substring(8, 10);

    } else {
      this.codigoSeguridad = stringUtilService.leftZero(data.codigoSeguridadAleatorio, 9);
      this.codigoControl = jsonDteAlgoritmos.generateCodigoControl(params, data, this.codigoSeguridad);
    }
  }

  /**
   * Si los valores vienen en underscore, crea los valores en formato variableJava que
   * sera utilizado dentro del proceso,
   *
   * Ej. si viene tipo_documento crea una variable tipoDocumento, con el mismo valor.
   *
   * @param data
   */
  private removeUnderscoreAndPutCamelCase(data: any) {
    if (data.tipo_documento) {
      data.tipoDocumento = data.tipo_documento;
    }

    if (data.condicion_tipo_cambio) {
      data.condicionTipoCambio = data.condicion_tipo_cambio;
    }

    //Objeto Cliente
    if (data.cliente?.razon_social) {
      data.cliente.razonSocial = data.cliente.razon_social;
    }
    if (data.cliente?.nombre_fantasia) {
      data.cliente.nombreFantasia = data.cliente.nombre_fantasia;
    }
    if (data.cliente?.tipo_operacion) {
      data.cliente.tipoOperacion = data.cliente.tipo_operacion;
    }

    //Campo que puede ser un numero = 0, hay que validar de esta forma
    if (typeof data.cliente != 'undefined' && typeof data.cliente.numero_casa != 'undefined') {
      data.cliente.numeroCasa = data.cliente.numero_casa + '';
    }
    if (data.cliente?.tipo_contribuyente) {
      data.cliente.tipoContribuyente = data.cliente.tipo_contribuyente;
    }
    if (data.cliente?.documento_tipo) {
      data.cliente.documentoTipo = data.cliente.documento_tipo;
    }
    if (data.cliente?.documento_numero) {
      data.cliente.documentoNumero = data.cliente.documento_numero;
    }

    //Usuario
    if (data.usuario?.documento_tipo) {
      data.usuario.documentoTipo = data.usuario.documento_tipo;
    }
    if (data.usuario?.documento_numero) {
      data.usuario.documentoNumero = data.usuario.documento_numero;
    }

    //Condicion entregas
    if (data.condicion?.entregas && data.condicion?.entregas.length > 0) {
      for (let i = 0; i < data.condicion.entregas.length; i++) {
        const entrega = data.condicion.entregas[i];

        if (entrega.info_tarjeta) {
          entrega.infoTarjeta = { ...entrega.info_tarjeta };
        }

        if (entrega.infoTarjeta?.razon_social) {
          entrega.infoTarjeta.razonSocial = entrega.infoTarjeta.razon_social;
        }

        if (entrega.infoTarjeta?.medio_pago) {
          entrega.infoTarjeta.medioPago = entrega.infoTarjeta.medio_pago;
        }

        if (entrega.infoTarjeta?.codigo_autorizacion) {
          entrega.infoTarjeta.codigoAutorizacion = entrega.infoTarjeta.codigo_autorizacion;
        }

        if (entrega.info_cheque) {
          entrega.infoCheque = { ...entrega.info_cheque };
        }

        if (entrega.infoCheque?.numero_cheque) {
          entrega.infoCheque.numeroCheque = entrega.infoCheque.numero_cheque;
        }
      }
    }

    if (data.condicion?.credito && data.condicion?.credito.length > 0) {
      for (let i = 0; i < data.condicion.credito.length; i++) {
        const credito = data.condicion.credito[i];

        if (credito.monto_entrega) {
          credito.montoEntrega = credito.monto_entrega;
        }

        if (credito.info_cuotas) {
          credito.infoCuotas = { ...credito.info_cuotas };
        }
      }
    }

  }

  /**
   * Añade algunos valores por defecto al JSON de entrada, valido para
   * todas las operaciones
   * @param data
   */
  private addDefaultValues(data: any) {

    if (!data['moneda']) {
      data['moneda'] = 'PYG';
    }
  }

  private generateRte(params: any) {
    this.json = {
      rDE: {
        $: {
          xmlns: 'http://ekuatia.set.gov.py/sifen/xsd',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://ekuatia.set.gov.py/sifen/xsd siRecepDE_v150.xsd',
        },
        dVerFor: params.version,
      },
    };
  }

  private generateRecibo(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      //throw new Error('RUC debe contener dígito verificador en params.ruc');
    }
    const rucEmisor = params['ruc'].split('-')[0];
    const dvEmisor = params['ruc'].split('-')[1];

    if (this.validateError) {
      var reg = new RegExp(/^\d+$/);
      if (!reg.test(rucEmisor)) {
        //throw new Error("El RUC '" + rucEmisor + "' debe ser numérico");
      }
      if (!reg.test(dvEmisor)) {
        //throw new Error("El DV del RUC '" + dvEmisor + "' debe ser numérico");
      }
    }
    const id = this.codigoControl;

    const fechaFirmaDigital = new Date(params.fechaFirmaDigital);

    let digitoVerificadorString = this.codigoControl + '';

    const jsonResult = {
      $: {
        Id: id,
      },
      dDVId: digitoVerificadorString.substring(digitoVerificadorString.length - 1, digitoVerificadorString.length),
      dFecFirma: fechaUtilService.convertToJSONFormat(new Date()),
      dSisFact: 1,
    };

    return jsonResult;
  }

  /**
     * Datos inerentes a la operacion 
     * <gOpeDE>
            <iTipEmi>1</iTipEmi>
            <dDesTipEmi>Normal</dDesTipEmi>
            <dCodSeg>000000023</dCodSeg>
            <dInfoEmi>1</dInfoEmi>
            <dInfoFisc>Información de interés del Fisco respecto al DE</dInfoFisc>
        </gOpeDE>

     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosOperacion(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      //throw new Error('RUC debe contener dígito verificador en params.ruc');
    }
    const rucEmisor = params['ruc'].split('-')[0];
    const dvEmisor = params['ruc'].split('-')[1];

    const id = jsonDteAlgoritmos.generateCodigoControl(params, data, this.codigoSeguridad);
    const digitoVerificador = jsonDteAlgoritmos.calcularDigitoVerificador(rucEmisor, 11);

    if (id.length != 44) {
    }

    const codigoSeguridadAleatorio = this.codigoSeguridad;

    this.json['rDE']['recibo']['gOpeDE'] = {
      dCodSeg: codigoSeguridadAleatorio,
    };

    if (data['observacion'] && data['observacion'].length > 0) {
      this.json['rDE']['recibo']['gOpeDE']['dInfoEmi'] = data['observacion'];
    }

    if (data['descripcion'] && data['descripcion'].length > 0) {
      this.json['rDE']['recibo']['gOpeDE']['dInfoFisc'] = data['descripcion'];
    }

  }

  /**
     * Genera los datos del timbrado
     * 
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosTimbrado(params: any, data: any) {
    this.json['rDE']['recibo']['gTimb'] = {
      iTiDE: data['tipoDocumento'],
      dDesTiDE: data['tipoDocumentoDescripcion'],
      dNumTim: params['timbradoNumero'],
      dEst: stringUtilService.leftZero(data['establecimiento'], 3),
      dPunExp: stringUtilService.leftZero(data['punto'], 3),
      dNumDoc: stringUtilService.leftZero(data['numero'], 7),
      //dSerieNum : null,
      dFeIniT: params['timbradoFecha'].substring(0, 10),
    };

    if (data['numeroSerie']) {
      this.json['rDE']['recibo']['gTimb']['dSerieNum'] = data['numeroSerie'];
    }
  }

  /**
     * Genera los campos generales, divide las actividades en diferentes metodos
     * 
     *  <gDatGralOpe>
            <dFeEmiDE>2020-05-07T15:03:57</dFeEmiDE>
        </gDatGralOpe>
     * 
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGenerales(params: any, data: any, config: XmlgenConfig) {
    this.json['rDE']['recibo']['gDatGralOpe'] = {
      dFeEmiDE: data['fecha'],
    };
    this.generateDatosGeneralesInherentesOperacion(params, data, config);
    this.generateDatosGeneralesEmisorDE(params, data);
    if (data['usuario']) {
      //No es obligatorio
      this.generateDatosGeneralesResponsableGeneracionDE(params, data);
    }
    this.generateDatosGeneralesReceptorDE(params, data);
  }

  /**
     * D1. Campos inherentes a la operación comercial (D010-D099)
     * Pertenece al grupo de datos generales
     * 
     * <gOpeCom>
            <iTipTra>1</iTipTra>
            <dDesTipTra>Venta de mercadería</dDesTipTra>
            <iTImp>1</iTImp>
            <dDesTImp>IVA</dDesTImp>
            <cMoneOpe>PYG</cMoneOpe>
            <dDesMoneOpe>Guarani</dDesMoneOpe>
        </gOpeCom>
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGeneralesInherentesOperacion(params: any, data: any, config: XmlgenConfig) {

    let moneda = data['moneda'];
    if (!moneda && config.defaultValues === true) {
      moneda = 'PYG';
    }

    this.json['rDE']['recibo']['gDatGralOpe']['gOpeCom'] = {};

    this.json['rDE']['recibo']['gDatGralOpe']['gOpeCom']['cMoneOpe'] = moneda; //D015
    this.json['rDE']['recibo']['gDatGralOpe']['gOpeCom']['dDesMoneOpe'] = constanteService.monedas.filter(
      (m) => m.codigo == moneda,
    )[0]['descripcion'];

    if (moneda != 'PYG') {
      //Obligatorio informar dCondTiCam D017
      this.json['rDE']['recibo']['gDatGralOpe']['gOpeCom']['dCondTiCam'] = data['condicionTipoCambio'];
    }
    if (data['condicionTipoCambio'] == 1 && moneda != 'PYG') {
      //Obligatorio informar dCondTiCam D018
      this.json['rDE']['recibo']['gDatGralOpe']['gOpeCom']['dTiCam'] = data['cambio'];
    }

  }

  /**
   * D2. Campos que identifican al emisor del Documento Electrónico DE (D100-D129)
   * Pertenece al grupo de datos generales
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosGeneralesEmisorDE(params: any, data: any) {
    if (!(params && params.establecimientos)) {
      //throw new Error('Debe proveer un Array con la información de los establecimientos en params');
    }

    //Validar si el establecimiento viene en params
    let establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);


    this.json['rDE']['recibo']['gDatGralOpe']['gEmis'] = {
      dRucEm: params['ruc'].split('-')[0],
      dDVEmi: params['ruc'].split('-')[1],
      iTipCont: params['tipoContribuyente'],
      cTipReg: params['tipoRegimen'],
      dNomEmi: params['razonSocial'],
      dNomFanEmi: params['nombreFantasia'],
      dDirEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['direccion'],
      dNumCas: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['numeroCasa'],
      dCompDir1: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0][
        'complementoDireccion1'
      ],
      dCompDir2: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0][
        'complementoDireccion2'
      ],
      cDepEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['departamento'],
      dDesDepEmi: constanteService.departamentos.filter(
        (td) =>
          td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['departamento'],
      )[0]['descripcion'],
      cDisEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['distrito'],
      dDesDisEmi: constanteService.distritos.filter(
        (td) =>
          td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['distrito'],
      )[0]['descripcion'],
      cCiuEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['ciudad'],
      dDesCiuEmi: constanteService.ciudades.filter(
        (td) => td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['ciudad'],
      )[0]['descripcion'],
      dTelEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['telefono'],
      dEmailE: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['email'],
      dDenSuc: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['denominacion'],
    };

    if (params['actividadesEconomicas'] && params['actividadesEconomicas'].length > 0) {
      this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gActEco'] = [];
      for (let i = 0; i < params['actividadesEconomicas'].length; i++) {
        const actividadEconomica = params['actividadesEconomicas'][i];
        const gActEco = {
          cActEco: actividadEconomica.codigo,
          dDesActEco: actividadEconomica.descripcion,
        };
        this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gActEco'].push(gActEco);
      }
    } else {
      //throw new Error('Debe proveer el array de actividades económicas en params.actividadesEconomicas');
    }
  }

  /**
   * Datos generales del responsable de generacion del DE
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosGeneralesResponsableGeneracionDE(params: any, data: any) {
    
    this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gRespDE'] = {
      iTipIDRespDE: data['usuario']['documentoTipo'],
      dDTipIDRespDE: constanteService.tiposDocumentosIdentidades.filter(
        (td) => td.codigo === data['usuario']['documentoTipo'],
      )[0]['descripcion'],
    };

    this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gRespDE']['dNumIDRespDE'] = data['usuario']['documentoNumero'];
    this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gRespDE']['dNomRespDE'] = data['usuario']['nombre'];
    this.json['rDE']['recibo']['gDatGralOpe']['gEmis']['gRespDE']['dCarRespDE'] = data['usuario']['cargo'];
  }

  /**
     * Datos generales del receptor del documento electrónico
     * Pertenece al grupo de datos generales
     * 
     * 
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGeneralesReceptorDE(params: any, data: any) {

    var regExpOnlyNumber = new RegExp(/^\d+$/);

    this.json['rDE']['recibo']['gDatGralOpe']['gDatRec'] = {
      iNatRec: data['cliente']['contribuyente'] ? 1 : 2,
      iTiOpe: data['cliente']['tipoOperacion'],
      cPaisRec: data['cliente']['pais'],
      dDesPaisRe: constanteService.paises.filter((pais) => pais.codigo === data['cliente']['pais'])[0]['descripcion'],
    };

    if (data['cliente']['contribuyente']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['iTiContRec'] = data['cliente']['tipoContribuyente'];
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dRucRec'] = (data['cliente']['ruc'].split('-')[0] + '').trim();
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDVRec'] = (data['cliente']['ruc'].split('-')[1] + '').trim();
    }
    if (!data['cliente']['contribuyente'] && data['cliente']['tipoOperacion']) {
      //Obligatorio completar D210

      if (this.validateError) {

        if (!data['cliente']['contribuyente'] && data['cliente']['tipoOperacion'] != 4) {

          this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['iTipIDRec'] = data['cliente']['documentoTipo'];

          this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDTipIDRec'] =
            constanteService.tiposDocumentosReceptor.filter(
              (tdr) => tdr.codigo === data['cliente']['documentoTipo'],
            )[0]['descripcion'];

          this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dNumIDRec'] = data['cliente']['documentoNumero'].trim();
        }

        if (+data['cliente']['documentoTipo'] === 5) {
          //Si es innominado completar con cero
          this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dNumIDRec'] = '0';
        }
      }
    }

    this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dNomRec'] = data['cliente']['razonSocial'].trim();

    //if (data['cliente']['documentoTipo'] === 5) {
    if (data['cliente']['nombreFantasia']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dNomFanRec'] = data['cliente']['nombreFantasia'].trim();
    }
    //}

    if (data['cliente']['direccion']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDirRec'] = data['cliente']['direccion'].trim();
    }

    if (data['cliente']['numeroCasa']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dNumCasRec'] = (data['cliente']['numeroCasa'] + '').trim();
    }

    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['cDepRec'] = +data['cliente']['departamento'];
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDesDepRec'] = constanteService.departamentos.filter(
        (td) => td.codigo === +data['cliente']['departamento'],
      )[0]['descripcion'];
    }

    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['cDisRec'] = +data['cliente']['distrito'];
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDesDisRec'] = constanteService.distritos.filter(
        (td) => td.codigo === +data['cliente']['distrito'],
      )[0]['descripcion'];
    }
    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['cCiuRec'] = +data['cliente']['ciudad'];
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dDesCiuRec'] = constanteService.ciudades.filter(
        (td) => td.codigo === +data['cliente']['ciudad'],
      )[0]['descripcion'];
    }
    if (data['cliente']['telefono']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec'].dTelRec = data['cliente']['telefono'].trim();
    }
    if (data['cliente']['celular']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec'].dCelRec = data['cliente']['celular'].trim();
    }
    if (data['cliente']['email']) {
      let email = new String(data['cliente']['email']); //Hace una copia, para no alterar.

      //Verificar si tiene varios correos.
      if (email.indexOf(',') > -1) {
        //Si el Email tiene , (coma) entonces va enviar solo el primer valor, ya que la SET no acepta Comas
        email = email.split(',')[0].trim();
      }

      //Verificar espacios
      if (email.indexOf(' ') > -1) {
        //throw new Error("El valor '" + email + "' en data.cliente.email no puede poseer espacios");
      }

      if (!(email.length >= 3 && email.length <= 80)) {
        //throw new Error("El valor '" + email + "' en data.cliente.email debe tener una longitud de 3 a 80 caracteres");
      }
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec'].dEmailRec = email.trim();
    }

    if (data['cliente']['codigo']) {
      this.json['rDE']['recibo']['gDatGralOpe']['gDatRec']['dCodCliente'] = (data['cliente']['codigo'] + '').trim();
    }
  }

  /**
   * E7. Campos que describen la condición de la operación (E600-E699)
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE(params: any, data: any) {
    if (
      constanteService.condicionesOperaciones.filter((um: any) => um.codigo === data['condicion']['tipo']).length == 0
    ) {
      /*throw new Error(
        "Condición de la Operación '" +
          data['condicion']['tipo'] +
          "' en data.condicion.tipo no encontrado. Valores: " +
          constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['recibo']['gDtipDE']['gCamCond'] = {
      iCondOpe: data['condicion']['tipo'],
      dDCondOpe: constanteService.condicionesOperaciones.filter((co) => co.codigo === data['condicion']['tipo'])[0][
        'descripcion'
      ],
    };

    //if (data['condicion']['tipo'] === 1) {
    this.generateDatosCondicionOperacionDE_Contado(params, data);
    //}

    if (data['condicion']['tipo'] === 2) {
      this.generateDatosCondicionOperacionDE_Credito(params, data);
    }
  }

  /**
   * E7.1. Campos que describen la forma de pago de la operación al contado o del monto
   * de la entrega inicial (E605-E619)
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_Contado(params: any, data: any) {
    if (data['condicion']['tipo'] === 1) {
      if (!(data['condicion']['entregas'] && data['condicion']['entregas'].length > 0)) {
        /*throw new Error(
          'El Tipo de Condición es 1 en data.condicion.tipo pero no se encontraron entregas en data.condicion.entregas',
        );*/
      }
    }

    if (data['condicion']['entregas'] && data['condicion']['entregas'].length > 0) {
      const entregas = [];
      for (let i = 0; i < data['condicion']['entregas'].length; i++) {
        const dataEntrega = data['condicion']['entregas'][i];

        if (constanteService.condicionesTiposPagos.filter((um: any) => um.codigo === dataEntrega['tipo']).length == 0) {
          /*throw new Error(
            "Condición de Tipo de Pago '" +
              dataEntrega['tipo'] +
              "' en data.condicion.entregas[" +
              i +
              '].tipo no encontrado. Valores: ' +
              constanteService.condicionesTiposPagos.map((a: any) => a.codigo + '-' + a.descripcion),
          );*/
        }

        const cuotaInicialEntrega: any = {
          iTiPago: dataEntrega['tipo'],
          dDesTiPag: constanteService.condicionesTiposPagos.filter((co) => co.codigo === dataEntrega['tipo'])[0][
            'descripcion'
          ],
          dMonTiPag: dataEntrega['monto'],
          //cMoneTiPag: dataEntrega['moneda'],
          //dTiCamTiPag : dataEntrega['cambio'],
        };

        if (!dataEntrega['moneda']) {
          //throw new Error('Moneda es obligatorio en data.condicion.entregas[' + i + '].moneda');
        }

        if (constanteService.monedas.filter((um) => um.codigo === dataEntrega['moneda']).length == 0) {
          /*throw new Error("Moneda '" + dataEntrega['moneda']) +
            "' data.condicion.entregas[" +
            i +
            '].moneda no válido. Valores: ' +
            constanteService.monedas.map((a) => a.codigo + '-' + a.descripcion);*/
        }

        cuotaInicialEntrega['cMoneTiPag'] = dataEntrega['moneda'];
        cuotaInicialEntrega['dDMoneTiPag'] = constanteService.monedas.filter(
          (m) => m.codigo == dataEntrega['moneda'],
        )[0]['descripcion'];

        if (dataEntrega['moneda'] != 'PYG') {
          if (dataEntrega['cambio']) {
            cuotaInicialEntrega['dTiCamTiPag'] = dataEntrega['cambio'];
          }
        }

        //Verificar si el Pago es con Tarjeta de crédito
        if (dataEntrega['tipo'] === 3 || dataEntrega['tipo'] === 4) {
          if (!dataEntrega['infoTarjeta']) {
            /*throw new Error(
              'Debe informar sobre la tarjeta en data.condicion.entregas[' +
                i +
                '].infoTarjeta si la forma de Pago es a Tarjeta',
            );*/
          }

          if (
            constanteService.condicionesOperaciones.filter(
              (um: any) => um.codigo === dataEntrega['infoTarjeta']['tipo'],
            ).length == 0
          ) {
            /*throw new Error(
              "Tipo de Tarjeta de Crédito '" +
                dataEntrega['infoTarjeta']['tipo'] +
                "' en data.condicion.entregas[" +
                i +
                '].infoTarjeta.tipo no encontrado. Valores: ' +
                constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
            );*/
          }

          if (dataEntrega['infoTarjeta']['ruc'].indexOf('-') == -1) {
            /*throw new Error(
              'Ruc de Proveedor de Tarjeta debe contener digito verificador en data.condicion.entregas[' +
                i +
                '].infoTarjeta.ruc',
            );*/
          }
          cuotaInicialEntrega['gPagTarCD'] = {
            iDenTarj: dataEntrega['infoTarjeta']['tipo'],
            dDesDenTarj:
              dataEntrega['infoTarjeta']['tipo'] === 99
                ? dataEntrega['infoTarjeta']['tipoDescripcion']
                : constanteService.tarjetasCreditosTipos.filter(
                    (co) => co.codigo === dataEntrega['infoTarjeta']['tipo'],
                  )[0]['descripcion'],
          };

          if (dataEntrega['infoTarjeta']['razonSocial'] && dataEntrega['infoTarjeta']['ruc']) {
            //Solo si se envia éste dato
            cuotaInicialEntrega['gPagTarCD']['dRSProTar'] = dataEntrega['infoTarjeta']['razonSocial'];
            cuotaInicialEntrega['gPagTarCD']['dRUCProTar'] = dataEntrega['infoTarjeta']['ruc'].split('-')[0];
            cuotaInicialEntrega['gPagTarCD']['dDVProTar'] = dataEntrega['infoTarjeta']['ruc'].split('-')[1];
          }

          cuotaInicialEntrega['gPagTarCD']['iForProPa'] = dataEntrega['infoTarjeta']['medioPago'];

          if (dataEntrega['infoTarjeta']['codigoAutorizacion']) {
            if (
              !(
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length >= 6 &&
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length <= 10
              )
            ) {
              /*throw new Error(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.codigoAutorizacion debe tener de 6 y 10 caracteres',
              );*/
            }
            cuotaInicialEntrega['gPagTarCD']['dCodAuOpe'] = +dataEntrega['infoTarjeta']['codigoAutorizacion'];
          }

          if (dataEntrega['infoTarjeta']['titular']) {
            cuotaInicialEntrega['gPagTarCD']['dNomTit'] = dataEntrega['infoTarjeta']['titular'];
          }

          if (dataEntrega['infoTarjeta']['numero']) {
            if (!((dataEntrega['infoTarjeta']['numero'] + '').length == 4)) {
              /*throw new Error(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.numero debe tener de 4 caracteres',
              );*/
            }

            cuotaInicialEntrega['gPagTarCD']['dNumTarj'] = dataEntrega['infoTarjeta']['numero'];
          }
        }

        //Verificar si el Pago es con Cheque
        if (dataEntrega['tipo'] === 2) {
          if (!dataEntrega['infoCheque']) {
            /*throw new Error(
              'Debe informar sobre el cheque en data.condicion.entregas[' +
                i +
                '].infoCheque si la forma de Pago es 2-Cheques',
            );*/
          }

          cuotaInicialEntrega['gPagCheq'] = {
            dNumCheq: stringUtilService.leftZero(dataEntrega['infoCheque']['numeroCheque'], 8),
            dBcoEmi: dataEntrega['infoCheque']['banco'],
          };
        }
        entregas.push(cuotaInicialEntrega);
      }
      this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPaConEIni'] = entregas; //Array de Entregas
    }
  }

  /**
   * E7.2. Campos que describen la operación a crédito (E640-E649)
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_Credito(params: any, data: any) {
    if (!data['condicion']['credito']['tipo']) {
      /*throw new Error(
        'El tipo de Crédito en data.condicion.credito.tipo es obligatorio si la condición posee créditos',
      );*/
    }

    if (
      constanteService.condicionesCreditosTipos.filter((um: any) => um.codigo === data['condicion']['credito']['tipo'])
        .length == 0
    ) {
      /*throw new Error(
        "Tipo de Crédito '" +
          data['condicion']['credito']['tipo'] +
          "' en data.condicion.credito.tipo no encontrado. Valores: " +
          constanteService.condicionesCreditosTipos.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred'] = {
      iCondCred: data['condicion']['credito']['tipo'],
      dDCondCred: constanteService.condicionesCreditosTipos.filter(
        (co) => co.codigo === +data['condicion']['credito']['tipo'],
      )[0]['descripcion'],
    };

    if (+data['condicion']['credito']['tipo'] === 1) {
      //Plazo
      if (!data['condicion']['credito']['plazo']) {
        /*throw new Error(
          'El tipo de Crédito en data.condicion.credito.tipo es 1 entonces data.condicion.credito.plazo es obligatorio',
        );*/
      }
      this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred']['dPlazoCre'] = data['condicion']['credito']['plazo'];
    }

    if (+data['condicion']['credito']['tipo'] === 2) {
      //Cuota
      if (!data['condicion']['credito']['cuotas']) {
        /*throw new Error(
          'El tipo de Crédito en data.condicion.credito.tipo es 2 entonces data.condicion.credito.cuotas es obligatorio',
        );*/
      }

      this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred']['dCuotas'] = +data['condicion']['credito']['cuotas'];
    }

    if (data['condicion']['entregas'] && data['condicion']['entregas'].length > 0) {
      let sumaEntregas = 0;
      //Obtiene la sumatoria
      for (let i = 0; i < data['condicion']['entregas'].length; i++) {
        const entrega = data['condicion']['entregas'][i];
        sumaEntregas += entrega['monto']; //Y cuando es de moneda diferente ? como hace?
      }

      this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred']['dMonEnt'] = sumaEntregas;
    }

    //Recorrer array de infoCuotas e informar en el JSON
    if (data['condicion']['credito']['tipo'] === 2) {
      this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred']['gCuotas'] = [];
      //A Cuotas
      if (data['condicion']['credito']['infoCuotas'] && data['condicion']['credito']['infoCuotas'].length > 0) {
        for (let i = 0; i < data['condicion']['credito']['infoCuotas'].length; i++) {
          const infoCuota = data['condicion']['credito']['infoCuotas'][i];

          if (constanteService.monedas.filter((um: any) => um.codigo === infoCuota['moneda']).length == 0) {
            /*throw new Error(
              "Moneda '" +
                infoCuota['moneda'] +
                "' en data.condicion.credito.infoCuotas[" +
                i +
                '].moneda no encontrado. Valores: ' +
                constanteService.monedas.map((a: any) => a.codigo + '-' + a.descripcion),
            );*/
          }

          const gCuotas = {
            cMoneCuo: infoCuota['moneda'],
            dDMoneCuo: constanteService.monedas.filter((co) => co.codigo === infoCuota['moneda'])[0]['descripcion'],
            dMonCuota: infoCuota['monto'],
            dVencCuo: infoCuota['vencimiento'],
          };

          this.json['rDE']['recibo']['gDtipDE']['gCamCond']['gPagCred']['gCuotas'].push(gCuotas);
        }
      } else {
        //throw new Error('Debe proporcionar data.condicion.credito.infoCuotas[]');
      }
    }
  }

  private normalizeXML(xml: string) {
    xml = xml.split('\r\n').join('');
    xml = xml.split('\n').join('');
    xml = xml.split('\t').join('');
    xml = xml.split('    ').join('');
    xml = xml.split('>    <').join('><');
    xml = xml.split('>  <').join('><');
    xml = xml.replace(/\r?\n|\r/g, '');
    return xml;
  }

}

export default new ReciboXmlMainService();
