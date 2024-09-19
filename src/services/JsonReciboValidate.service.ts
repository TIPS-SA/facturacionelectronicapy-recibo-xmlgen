import stringUtilService from './StringUtil.service';
import fechaUtilService from './FechaUtil.service';
import constanteService from './constants.service';
import { XmlgenConfig } from './type.interface.';

class JSonReciboValidateService {
  errors: Array<string>;

  constructor() {
    this.errors = new Array<string>();
  }
  /**
   * Valida los datos ingresados en el data
   * @param data
   */
  public validateValues(params: any, data: any, config: XmlgenConfig) {
    this.errors = new Array<string>();

    if (typeof data['cliente'] == 'undefined') {
      this.errors.push('Debe especificar los datos del Cliente en data.cliente');
    }

    if (data['cliente']) {
      if (typeof data['cliente']['contribuyente'] == 'undefined') {
        this.errors.push(
          'Debe indicar si el Cliente es o no un Contribuyente true|false en data.cliente.contribuyente',
        );
      }

      if (typeof data['cliente']['contribuyente'] == 'undefined') {
        this.errors.push(
          'Debe indicar si el Cliente es o no un Contribuyente true|false en data.cliente.contribuyente',
        );
      }

      if (!(data['cliente']['contribuyente'] === true || data['cliente']['contribuyente'] === false)) {
        this.errors.push('data.cliente.contribuyente debe ser true|false');
      }
    }

    this.generateCodigoControlValidate(params, data);

    this.generateDeValidate(params, data);

    this.generateDatosOperacionValidate(params, data);

    this.generateDatosGeneralesValidate(params, data);

    this.generateDatosCondicionOperacionDEValidate(params, data);

    this.generateDatosTotalesValidate(params, data);

    if (data['moneda'] != 'PYG' && data['condicionTipoCambio'] == 1) {
      if (!data['cambio']) {
        this.errors.push(
          'Debe especificar el valor del Cambio en data.cambio cuando moneda != PYG y la Cotización es Global',
        );
      }
    }

    if (data['documentoAsociado']) {
      this.generateDatosDocumentosAsociadosValidate(params, data);
    } else {
      if (!data['concepto']) {
        this.errors.push('Debe especificar el Concepto en data.concepto o especificar los Documentos Asociados');
      }
    }

    //Tratamiento Final, del Envio del Error, no tocar
    if (this.errors.length > 0) {
      let errorExit: any = new Error();

      let msgErrorExit = '';

      let recorrerHasta = this.errors.length;
      if ((config.errorLimit || 3) < recorrerHasta) {
        recorrerHasta = config.errorLimit || 3;
      }

      for (let i = 0; i < recorrerHasta; i++) {
        const error = this.errors[i];
        msgErrorExit += error;

        if (i < recorrerHasta - 1) {
          msgErrorExit += config.errorSeparator + '';
        }
      }

      errorExit.message = msgErrorExit;
      /*errorExit.firstMessage = this.errors[0];
      errorExit.errorsArray = this.errors;*/
      throw errorExit;
    }
  }

  generateCodigoControlValidate(params: any, data: any) {
    if (data.cdc && (data.cdc + '').length == 44) {
      //Caso ya se le pase el CDC
      //const codigoSeguridad = data.cdc.substring(34, 43);
      const codigoControl = data.cdc;

      //Como se va utilizar el CDC enviado como parametro, va a verificar que todos los datos del XML coincidan con el CDC.
      const tipoDocumentoCDC = codigoControl.substring(0, 2);
      //const rucCDC = this.codigoControl.substring(2, 10);
      //const dvCDC = this.codigoControl.substring(10, 11);
      const establecimientoCDC = codigoControl.substring(11, 14);
      const puntoCDC = codigoControl.substring(14, 17);
      const numeroCDC = codigoControl.substring(17, 24);
      //const tipoContribuyenteCDC = this.codigoControl.substring(24, 25);
      const fechaCDC = codigoControl.substring(25, 33);
      const tipoEmisionCDC = codigoControl.substring(33, 34);

      if (+data['tipoDocumento'] != +tipoDocumentoCDC) {
        this.errors.push(
          "El Tipo de Documento '" +
            data['tipoDocumento'] +
            "' en data.tipoDocumento debe coincidir con el CDC re-utilizado (" +
            +tipoDocumentoCDC +
            ')',
        );
      }

      const establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);
      if (establecimiento != establecimientoCDC) {
        this.errors.push(
          "El Establecimiento '" +
            establecimiento +
            "'en data.establecimiento debe coincidir con el CDC reutilizado (" +
            establecimientoCDC +
            ')',
        );
      }

      const punto = stringUtilService.leftZero(data['punto'], 3);
      if (punto != puntoCDC) {
        this.errors.push(
          "El Punto '" + punto + "' en data.punto debe coincidir con el CDC reutilizado (" + puntoCDC + ')',
        );
      }

      const numero = stringUtilService.leftZero(data['numero'], 7);
      if (numero != numeroCDC) {
        this.errors.push(
          "El Numero de Documento '" +
            numero +
            "'en data.numero debe coincidir con el CDC reutilizado (" +
            numeroCDC +
            ')',
        );
      }

      /*if (+data['tipoContribuyente'] != +tipoContribuyenteCDC) {
        this.errors.push("El Tipo de Contribuyente '" + data['tipoContribuyente'] + "' en data.tipoContribuyente debe coincidir con el CDC reutilizado (" + tipoContribuyenteCDC + ")");
      }*/
      const fecha =
        (data['fecha'] + '').substring(0, 4) +
        (data['fecha'] + '').substring(5, 7) +
        (data['fecha'] + '').substring(8, 10);
      if (fecha != fechaCDC) {
        this.errors.push(
          "La fecha '" + fecha + "' en data.fecha debe coincidir con el CDC reutilizado (" + fechaCDC + ')',
        );
      }

      if (+data['tipoEmision'] != +tipoEmisionCDC) {
        this.errors.push(
          "El Tipo de Emisión '" +
            data['tipoEmision'] +
            "' en data.tipoEmision debe coincidir con el CDC reutilizado (" +
            tipoEmisionCDC +
            ')',
        );
      }
    }
  }

  private generateDeValidate(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      this.errors.push('RUC debe contener dígito verificador en params.ruc');
    }
    let rucEmisor = params['ruc'].split('-')[0];
    const dvEmisor = params['ruc'].split('-')[1];

    var reg = new RegExp(/^\d+$/);
    if (!reg.test(rucEmisor)) {
      this.errors.push("El RUC '" + rucEmisor + "' debe ser numérico");
    }
    if (!reg.test(dvEmisor)) {
      this.errors.push("El DV del RUC '" + dvEmisor + "' debe ser numérico");
    }

    if (rucEmisor.length > 8) {
      this.errors.push("El RUC '" + rucEmisor + "' debe contener de 1 a 8 caracteres");
    }

    if (dvEmisor > 9) {
      this.errors.push("El DV del RUC '" + dvEmisor + "' debe ser del 1 al 9");
    }
  }

  private generateDatosOperacionValidate(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      this.errors.push('RUC debe contener dígito verificador en params.ruc');
    }

    //Validar aqui "dInfoFisc"
    if (data['tipoDocumento'] == 7) {
      //Nota de Remision
      if (!(data['descripcion'] && data['descripcion'].length > 0)) {
        this.errors.push('Debe informar la Descripción en data.descripcion para el Documento Electrónico');
      }
    }
  }

  private generateDatosGeneralesValidate(params: any, data: any, defaultValues?: boolean) {
    this.generateDatosGeneralesInherentesOperacionValidate(params, data, defaultValues);
    this.generateDatosGeneralesEmisorDEValidate(params, data);
    if (data['usuario']) {
      //No es obligatorio
      this.generateDatosGeneralesResponsableGeneracionDEValidate(params, data);
    }
    this.generateDatosGeneralesReceptorDEValidate(params, data);
  }

  private generateDatosGeneralesInherentesOperacionValidate(params: any, data: any, defaultValues?: boolean) {
    if (data['tipoDocumento'] == 7) {
      //C002
      return; //No informa si el tipo de documento es 7
    }

    if (!fechaUtilService.isIsoDate(data['fecha'])) {
      this.errors.push(
        "Valor de la Fecha '" + data['fecha'] + "' en data.fecha no válido. Formato: yyyy-MM-ddTHH:mm:ss",
      );
    }

    let moneda = data['moneda'];
    if (!moneda && defaultValues === true) {
      moneda = 'PYG';
    }

    if (constanteService.monedas.filter((um) => um.codigo === moneda).length == 0) {
      this.errors.push(
        "Moneda '" +
          moneda +
          "' en data.moneda no válido. Valores: " +
          constanteService.monedas.map((a) => a.codigo + '-' + a.descripcion),
      );
    }

    if (data['condicionAnticipo']) {
      if (constanteService.globalPorItem.filter((um) => um.codigo === data['condicionAnticipo']).length == 0) {
        this.errors.push(
          "Condición de Anticipo '" +
            data['condicionAnticipo'] +
            "' en data.condicionAnticipo no válido. Valores: " +
            constanteService.globalPorItem.map((a) => a.codigo + '-Anticipo ' + a.descripcion),
        );
      }
    }

    /*if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 4) {
      //Obligatorio informar iTipTra D011
      if (!data['tipoTransaccion']) {
        this.errors.push('Debe proveer el Tipo de Transacción en data.tipoTransaccion');
      }
    }*/

    if (moneda != 'PYG') {
      if (!data['condicionTipoCambio']) {
        this.errors.push('Debe informar el tipo de Cambio en data.condicionTipoCambio');
      }
    }

    if (data['condicionTipoCambio'] == 1 && moneda != 'PYG') {
      if (!(data['cambio'] && data['cambio'] > 0)) {
        this.errors.push('Debe informar el valor del Cambio en data.cambio');
      }
    }
  }

  private generateDatosGeneralesEmisorDEValidate(params: any, data: any) {
    if (!(params && params.establecimientos)) {
      this.errors.push('Debe proveer un Array con la información de los establecimientos en params');
    }

    //Validar si el establecimiento viene en params
    let establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);
    //let punto = stringUtilService.leftZero(data['punto'], 3);

    if (params.establecimientos.filter((um: any) => um.codigo === establecimiento).length == 0) {
      this.errors.push(
        "Establecimiento '" +
          establecimiento +
          "' no encontrado en params.establecimientos*.codigo. Valores: " +
          params.establecimientos.map((a: any) => a.codigo + '-' + a.denominacion),
      );
    }

    if (params['ruc'].indexOf('-') == -1) {
      this.errors.push('RUC debe contener dígito verificador en params.ruc');
    }

    if (!(params['actividadesEconomicas'] && params['actividadesEconomicas'].length > 0)) {
      this.errors.push('Debe proveer el array de actividades económicas en params.actividadesEconomicas');
    }
  }

  private generateDatosGeneralesResponsableGeneracionDEValidate(params: any, data: any) {
    if (
      constanteService.tiposDocumentosIdentidades.filter((um: any) => um.codigo === data['usuario']['documentoTipo'])
        .length == 0
    ) {
      this.errors.push(
        "Tipo de Documento '" +
          data['usuario']['documentoTipo'] +
          "' no encontrado en data.usuario.documentoTipo. Valores: " +
          constanteService.tiposDocumentosIdentidades.map((a: any) => a.codigo + '-' + a.descripcion),
      );
    }

    if (!data['usuario']['documentoNumero']) {
      this.errors.push('El Documento del Responsable en data.usuario.documentoNumero no puede ser vacio');
    }

    if (!data['usuario']['nombre']) {
      this.errors.push('El Nombre del Responsable en data.usuario.nombre no puede ser vacio');
    }

    if (!data['usuario']['cargo']) {
      this.errors.push('El Cargo del Responsable en data.usuario.cargo no puede ser vacio');
    }
  }

  private generateDatosGeneralesReceptorDEValidate(params: any, data: any) {
    if (!data['cliente']) {
      return; //El error de cliente vacio, ya fue validado arriba
    }

    if (!data['cliente']['contribuyente']) {
      if (
        constanteService.tiposDocumentosReceptor.filter((um: any) => um.codigo === data['cliente']['documentoTipo'])
          .length == 0
      ) {
        this.errors.push(
          "Tipo de Documento '" +
            data['cliente']['documentoTipo'] +
            "' del Cliente en data.cliente.documentoTipo no encontrado. Valores: " +
            constanteService.tiposDocumentosReceptor.map((a: any) => a.codigo + '-' + a.descripcion),
        );
      }
    }

    var regExpOnlyNumber = new RegExp(/^\d+$/);
    if (data['cliente']['contribuyente']) {
      if (!data['cliente']['ruc']) {
        this.errors.push('Debe proporcionar el RUC en data.cliente.ruc');
      } else {
        if (data['cliente']['ruc'].indexOf('-') == -1) {
          this.errors.push('RUC debe contener dígito verificador en data.cliente.ruc');
        }

        const rucCliente = data['cliente']['ruc'].split('-');

        if (!regExpOnlyNumber.test((rucCliente[0] + '').trim())) {
          this.errors.push("El RUC del Cliente '" + rucCliente[0] + "' en data.cliente.ruc debe ser numérico");
        }
        if (!regExpOnlyNumber.test((rucCliente[1] + '').trim())) {
          this.errors.push("El DV del RUC del Cliente '" + rucCliente[1] + "' en data.cliente.ruc debe ser numérico");
        }

        if (rucCliente[0].length > 8) {
          this.errors.push("El RUC '" + rucCliente[0] + "' debe contener de 1 a 8 caracteres");
        }

        if (rucCliente[1] > 9) {
          this.errors.push("El DV del RUC '" + rucCliente[1] + "' debe ser del 1 al 9");
        }
      }
    }

    if (constanteService.paises.filter((pais: any) => pais.codigo === data['cliente']['pais']).length == 0) {
      this.errors.push(
        "Pais '" +
          data['cliente']['pais'] +
          "' del Cliente en data.cliente.pais no encontrado. Valores: " +
          constanteService.paises.map((a: any) => a.codigo + '-' + a.descripcion),
      );
    }

    if (data['cliente']['direccion']) {
      //Si tiene dirección hay que completar numero de casa.
      if (!data['cliente']['numeroCasa']) {
        this.errors.push('Debe informar el Número de casa del Receptor en data.cliente.numeroCasa');
      }
    }

    if (data['cliente']['numeroCasa']) {
      if (!regExpOnlyNumber.test(data['cliente']['numeroCasa'])) {
        this.errors.push('El Número de Casa en data.cliente.numeroCasa debe ser numérico');
      }
    }

    if (data['cliente']['ciudad']) {
      if (constanteService.ciudades.filter((ciudad: any) => ciudad.codigo === +data['cliente']['ciudad']).length == 0) {
        this.errors.push(
          "Ciudad '" +
            data['cliente']['ciudad'] +
            "' del Cliente en data.cliente.ciudad no encontrado. Valores: " +
            constanteService.ciudades.map((a: any) => a.codigo + '-' + a.descripcion),
        );
      }

      //De acuerdo a la Ciudad pasada como parametro, buscar el distrito y departamento y asignar dichos
      //valores de forma predeterminada, auque este valor sera sobre-escrito, caso el usuario envie
      //data['cliente']['distrito'] y data['cliente']['departamento']
      let objCiudad: any = constanteService.ciudades.filter((ciu) => ciu.codigo === +data['cliente']['ciudad']);

      let objDistrito: any = constanteService.distritos.filter((dis) => dis.codigo === +objCiudad[0]['distrito']);

      let objDepartamento: any = constanteService.distritos.filter(
        (dep) => dep.codigo === +objDistrito[0]['departamento'],
      );

      data['cliente']['distrito'] = objDistrito[0]['codigo'];

      data['cliente']['departamento'] = objDepartamento[0]['codigo'];
    }

    if (data['cliente']['direccion']) {
      if (!data['cliente']['distrito']) {
        this.errors.push('Obligatorio especificar el Distrito en data.cliente.distrito');
      } else {
        if (
          constanteService.distritos.filter((distrito: any) => distrito.codigo === +data['cliente']['distrito'])
            .length == 0
        ) {
          this.errors.push(
            "Distrito '" +
              data['cliente']['distrito'] +
              "' del Cliente en data.cliente.distrito no encontrado. Valores: " +
              constanteService.distritos.map((a: any) => a.codigo + '-' + a.descripcion),
          );
        }
      }
    }

    if (data['cliente']['direccion']) {
      if (!data['cliente']['departamento']) {
        this.errors.push(
          'Obligatorio especificar el Departamento en data.cliente.departamento para Tipo de Documento != 4',
        );
      } else {
        if (
          constanteService.departamentos.filter(
            (departamento: any) => departamento.codigo === +data['cliente']['departamento'],
          ).length == 0
        ) {
          this.errors.push(
            "Departamento '" +
              data['cliente']['departamento'] +
              "' del Cliente en data.cliente.departamento no encontrado. Valores: " +
              constanteService.departamentos.map((a: any) => a.codigo + '-' + a.descripcion),
          );
        }
      }
    }

    constanteService.validateDepartamentoDistritoCiudad(
      'data.cliente',
      +data['cliente']['departamento'],
      +data['cliente']['distrito'],
      +data['cliente']['ciudad'],
      this.errors,
    );

    if (data['cliente']['telefono']) {
      if (!(data['cliente']['telefono'].length >= 6 && data['cliente']['telefono'].length <= 15)) {
        this.errors.push(
          "El valor '" +
            data['cliente']['telefono'] +
            "' en data.cliente.telefono debe tener una longitud de 6 a 15 caracteres",
        );
      }
    }

    if (data['cliente']['celular']) {
      if (!(data['cliente']['celular'].length >= 10 && data['cliente']['celular'].length <= 20)) {
        this.errors.push(
          "El valor '" +
            data['cliente']['celular'] +
            "' en data.cliente.celular debe tener una longitud de 10 a 20 caracteres",
        );
      }
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
        this.errors.push("El valor '" + email + "' en data.cliente.email no puede poseer espacios");
      }

      if (!(email.length >= 3 && email.length <= 80)) {
        this.errors.push("El valor '" + email + "' en data.cliente.email debe tener una longitud de 3 a 80 caracteres");
      }
    }

    if (data['cliente']['codigo']) {
      if (!((data['cliente']['codigo'] + '').length >= 3)) {
        this.errors.push(
          "El código del Cliente '" +
            data['cliente']['codigo'] +
            "' en data.cliente.codigo debe tener al menos 3 caracteres",
        );
      }
    }
  }

  private generateDatosCondicionOperacionDEValidate(params: any, data: any) {
    /*if (!data['condicion']) {
      this.errors.push('Debe indicar los datos de la Condición de la Operación en data.condicion');
      return; // sale metodo
    }*/

    if (data['condicion']) {
      if (
        constanteService.condicionesOperaciones.filter((um: any) => um.codigo === data['condicion']['tipo']).length == 0
      ) {
        this.errors.push(
          "Condición de la Operación '" +
            data['condicion']['tipo'] +
            "' en data.condicion.tipo no encontrado. Valores: " +
            constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
        );
      }

      //if (data['condicion']['tipo'] === 1) {
      this.generateDatosCondicionOperacionDE_ContadoValidate(params, data);
      //}

      if (data['condicion']['tipo'] === 2) {
        this.generateDatosCondicionOperacionDE_CreditoValidate(params, data);
      }
    }
  }

  /**
   * E7.1. Campos que describen la forma de pago de la operación al contado o del monto
   * de la entrega inicial (E605-E619)
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_ContadoValidate(params: any, data: any) {
    if (data['condicion']['tipo'] === 1) {
      if (!(data['condicion']['entregas'] && data['condicion']['entregas'].length > 0)) {
        this.errors.push(
          'El Tipo de Condición es 1 en data.condicion.tipo pero no se encontraron entregas en data.condicion.entregas',
        );
      }
    }

    if (data['condicion']['entregas'] && data['condicion']['entregas'].length > 0) {
      for (let i = 0; i < data['condicion']['entregas'].length; i++) {
        const dataEntrega = data['condicion']['entregas'][i];

        if (constanteService.condicionesTiposPagos.filter((um: any) => um.codigo === dataEntrega['tipo']).length == 0) {
          this.errors.push(
            "Condición de Tipo de Pago '" +
              dataEntrega['tipo'] +
              "' en data.condicion.entregas[" +
              i +
              '].tipo no encontrado. Valores: ' +
              constanteService.condicionesTiposPagos.map((a: any) => a.codigo + '-' + a.descripcion),
          );
        }

        if (!dataEntrega['moneda']) {
          this.errors.push('Moneda es obligatorio en data.condicion.entregas[' + i + '].moneda');
        }

        if (constanteService.monedas.filter((um) => um.codigo === dataEntrega['moneda']).length == 0) {
          this.errors.push("Moneda '" + dataEntrega['moneda']) +
            "' data.condicion.entregas[" +
            i +
            '].moneda no válido. Valores: ' +
            constanteService.monedas.map((a) => a.codigo + '-' + a.descripcion);
        }

        //Verificar si el Pago es con Tarjeta de crédito
        if (dataEntrega['tipo'] === 3 || dataEntrega['tipo'] === 4) {
          if (!dataEntrega['infoTarjeta']) {
            this.errors.push(
              'Debe informar sobre la tarjeta en data.condicion.entregas[' +
                i +
                '].infoTarjeta si la forma de Pago es a Tarjeta',
            );
          }

          if (
            constanteService.condicionesOperaciones.filter(
              (um: any) => um.codigo === dataEntrega['infoTarjeta']['tipo'],
            ).length == 0
          ) {
            this.errors.push(
              "Tipo de Tarjeta de Crédito '" +
                dataEntrega['infoTarjeta']['tipo'] +
                "' en data.condicion.entregas[" +
                i +
                '].infoTarjeta.tipo no encontrado. Valores: ' +
                constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
            );
          }

          if (dataEntrega['infoTarjeta']['ruc'].indexOf('-') == -1) {
            this.errors.push(
              'Ruc de Proveedor de Tarjeta debe contener digito verificador en data.condicion.entregas[' +
                i +
                '].infoTarjeta.ruc',
            );
          }

          if (dataEntrega['infoTarjeta']['codigoAutorizacion']) {
            if (
              !(
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length >= 6 &&
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length <= 10
              )
            ) {
              this.errors.push(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.codigoAutorizacion debe tener de 6 y 10 caracteres',
              );
            }
          }

          if (dataEntrega['infoTarjeta']['numero']) {
            if (!((dataEntrega['infoTarjeta']['numero'] + '').length == 4)) {
              this.errors.push(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.numero debe tener de 4 caracteres',
              );
            }
          }
        }

        //Verificar si el Pago es con Cheque
        if (dataEntrega['tipo'] === 2) {
          if (!dataEntrega['infoCheque']) {
            this.errors.push(
              'Debe informar sobre el cheque en data.condicion.entregas[' +
                i +
                '].infoCheque si la forma de Pago es 2-Cheques',
            );
          }
        }
      }
    }
  }

  /**
   * E7.2. Campos que describen la operación a crédito (E640-E649)
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_CreditoValidate(params: any, data: any) {
    if (!data['condicion']['credito']['tipo']) {
      this.errors.push(
        'El tipo de Crédito en data.condicion.credito.tipo es obligatorio si la condición posee créditos',
      );
    }

    if (
      constanteService.condicionesCreditosTipos.filter((um: any) => um.codigo === data['condicion']['credito']['tipo'])
        .length == 0
    ) {
      this.errors.push(
        "Tipo de Crédito '" +
          data['condicion']['credito']['tipo'] +
          "' en data.condicion.credito.tipo no encontrado. Valores: " +
          constanteService.condicionesCreditosTipos.map((a: any) => a.codigo + '-' + a.descripcion),
      );
    }

    if (+data['condicion']['credito']['tipo'] === 1) {
      //Plazo
      if (!data['condicion']['credito']['plazo']) {
        this.errors.push(
          'El tipo de Crédito en data.condicion.credito.tipo es 1 entonces data.condicion.credito.plazo es obligatorio',
        );
      }
    }

    if (+data['condicion']['credito']['tipo'] === 2) {
      //Cuota
      if (!data['condicion']['credito']['cuotas']) {
        this.errors.push(
          'El tipo de Crédito en data.condicion.credito.tipo es 2 entonces data.condicion.credito.cuotas es obligatorio',
        );
      }
    }

    //Recorrer array de infoCuotas e informar en el JSON
    if (data['condicion']['credito']['tipo'] === 2) {
      //A Cuotas
      if (data['condicion']['credito']['infoCuotas'] && data['condicion']['credito']['infoCuotas'].length > 0) {
        for (let i = 0; i < data['condicion']['credito']['infoCuotas'].length; i++) {
          const infoCuota = data['condicion']['credito']['infoCuotas'][i];

          if (constanteService.monedas.filter((um: any) => um.codigo === infoCuota['moneda']).length == 0) {
            this.errors.push(
              "Moneda '" +
                infoCuota['moneda'] +
                "' en data.condicion.credito.infoCuotas[" +
                i +
                '].moneda no encontrado. Valores: ' +
                constanteService.monedas.map((a: any) => a.codigo + '-' + a.descripcion),
            );
          }
        }
      } else {
        this.errors.push('Debe proporcionar data.condicion.credito.infoCuotas[]');
      }
    }
  }

  public generateDatosTotalesValidate(params: any, data: any) {
    if (data['moneda'] != 'PYG' && data['condicionTipoCambio'] == 1) {
      if (!data['cambio']) {
        this.errors.push(
          'Debe especificar el valor del Cambio en data.cambio cuando moneda != PYG y la Cotización es Global',
        );
      }
    }
  }

  /**
   *
   * @param params
   * @param data
   * @param options
   */
  public generateDatosDocumentosAsociadosValidate(params: any, data: any) {
    if (data['documentoAsociado']) {
      if (Array.isArray(data['documentoAsociado'])) {
        for (let i = 0; i < data['documentoAsociado'].length; i++) {
          this.generateDatosDocumentoAsociadoValidate(params, data['documentoAsociado'][i], i);
        }
      } else {
        this.generateDatosDocumentoAsociadoValidate(params, data['documentoAsociado'], 0);
      }
    }
  }

  /**
   * H. Campos que identifican al documento asociado (H001-H049)
   *
   * @param params
   * @param documentoAsociado
   * @param options
   */
  public generateDatosDocumentoAsociadoValidate(params: any, documentoAsociado: any, i: number) {
    //Validaciones
    if (
      constanteService.tiposDocumentosAsociados.filter((um) => um.codigo === documentoAsociado['formato']).length == 0
    ) {
      this.errors.push(
        "Formato de Documento Asociado '" +
          documentoAsociado['formato'] +
          "' en data.documentoAsociado[" +
          i +
          '].formato no encontrado. Valores: ' +
          constanteService.tiposDocumentosAsociados.map((a) => a.codigo + '-' + a.descripcion),
      );
    } else {
      //Si ya tiene formato
      if (+documentoAsociado['formato'] == 1) {
        //H002 = Electronico
        if (documentoAsociado['cdc']) {
          if (documentoAsociado['cdc'].length != 44) {
            this.errors.push('El CDC asociado debe tener 44 digitos en data.documentoAsociado[' + i + '].cdc');
          }
        }
      }

      if (+documentoAsociado['formato'] == 2) {
        if (
          constanteService.tiposDocumentosImpresos.filter(
            (um) => um.codigo === documentoAsociado['tipoDocumentoImpreso'],
          ).length == 0
        ) {
          this.errors.push(
            "Tipo de Documento impreso '" +
              documentoAsociado['tipoDocumentoImpreso'] +
              "' en data.documentoAsociado[" +
              i +
              '].tipoDocumentoImpreso no encontrado. Valores: ' +
              constanteService.tiposDocumentosImpresos.map((a) => a.codigo + '-' + a.descripcion),
          );
        }

        if (documentoAsociado['timbrado']) {
          if ((documentoAsociado['timbrado'] + '').length != 8) {
            this.errors.push('El Timbrado asociado debe tener 8 digitos en data.documentoAsociado[' + i + '].timbrado');
          }
        } else {
          this.errors.push('Debe especificar el Timbrado asociado en data.documentoAsociado[' + i + '].timbrado');
        }

        if (!documentoAsociado['establecimiento']) {
          this.errors.push(
            'Debe especificar el Establecimiento asociado en data.documentoAsociado[' + i + '].establecimiento',
          );
        }

        if (!documentoAsociado['punto']) {
          this.errors.push('Debe especificar el Punto asociado en data.documentoAsociado[' + i + '].punto');
        }

        if (!documentoAsociado['numero']) {
          this.errors.push('Debe especificar el Numero asociado en data.documentoAsociado[' + i + '].numero');
        }

        if (documentoAsociado['fecha']) {
          if (documentoAsociado['fecha'].length != 10) {
            this.errors.push('La Fecha del asociado debe tener 10 digitos en data.documentoAsociado[' + i + '].fecha');
          }
        } else {
          this.errors.push('Debe especificar La Fecha del asociado en data.documentoAsociado[' + i + '].fecha');
        }
      }
    }
  }
}

export default new JSonReciboValidateService();
