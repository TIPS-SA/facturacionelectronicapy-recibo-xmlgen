import { XmlgenConfig } from './type.interface.';

class ReciboXmlTotalesService {
  /**
   * F. Campos que describen los subtotales y totales de la transacción documentada (F001-F099)
   *
   * @param params
   * @param data
   * @param options
   */
  public generateDatosTotalesRecibo(params: any, data: any, config: XmlgenConfig) {
    let moneda = data['moneda'];
    if (!moneda && config.defaultValues === true) {
      moneda = 'PYG';
    }

    let sumaMontos = +data.total;
    if (data.documentoAsociado) {
      sumaMontos = 0;
      if (Array.isArray(data.documentoAsociado)) {
        for (let i = 0; i < data.documentoAsociado.length; i++) {
          let montoNumerico = +data.documentoAsociado[i]['monto'];
          sumaMontos += parseFloat(montoNumerico.toFixed(config.decimals));
        }
      } else {
        let montoNumerico = +data.documentoAsociado['monto'];
        sumaMontos += parseFloat(montoNumerico.toFixed(config.decimals));
      }
    }

    let dTotOpe = sumaMontos,
      dTotOpeGs = 0;

    console.log('dTotOpe', dTotOpe);
    if (data.moneda != 'PYG') {
      dTotOpe = parseFloat(dTotOpe.toFixed(config.decimals));
    }

    let dRedon = 0;
    if (config.redondeoSedeco) {
      if (data.moneda === 'PYG') {
        dRedon = this.redondeoSedeco(dTotOpe);
      } else {
        //Observación: Para monedas extranjeras o cualquier otro cálculo que contenga decimales, las reglas de validación
        //aceptarán redondeos de 50 céntimos (por encima o por debajo)
        if (dTotOpe % 1 != 0) {
          //Es moneda extranjera, en decimal
          console.log('Moneda extranjera decimal ' + dTotOpe);
        }
      }
    }

    //---
    //Corresponde al cálculo aritmético F008 - F013 + F025
    let dTotGralOpe = dTotOpe - dRedon;
    if (data.moneda != 'PYG') {
      dTotGralOpe = parseFloat(dTotGralOpe.toFixed(config.decimals));
    }

    //---

    //Asignar al JSON DATA
    let jsonResult: any = {};

    if (data.moneda != 'PYG') {
      dTotOpe = parseFloat(dTotOpe.toFixed(config.decimals));
    } else {
      dTotOpe = parseFloat(dTotOpe.toFixed(config.pygDecimals));
    }

    jsonResult = Object.assign(jsonResult, {
      dTotOpe: dTotOpe, //F008
      dRedon: dRedon, //F013
    });

    jsonResult = Object.assign(jsonResult, {
      dTotGralOpe: dTotGralOpe, //F014
    });

    if (moneda != 'PYG' && data['condicionTipoCambio'] == 1) {
      //Por el Global
      jsonResult['dTotalGs'] = parseFloat((dTotGralOpe * data['cambio']).toFixed(config.pygDecimals));
    }
    if (moneda != 'PYG' && data['condicionTipoCambio'] == 2) {
      //Por item
      jsonResult['dTotalGs'] = dTotOpeGs;
    }
    if (moneda != 'PYG') {
      if (data['tipoDocumento'] == 4) {
        jsonResult['dTotalGs'] = dTotGralOpe;
      }
    }
    return jsonResult;
  }

  /**
   * En consideración a la Resolución 347 del 2014 (Secretaría de Defensa del Consumidor-
   * SEDECO). Las reglas de redondeo aplican a múltiplos de 50 guaraníes
   *
   * Obtiene solo la parte del valor de redondeo, para obtener el monto del reondeo hay
   * que restar el valor de éste calculo
   *
   * @param numero
   * @returns
   */
  public redondeoSedeco(numero: any) {
    let parteDecimal: number = parseFloat((numero / 100).toFixed(2));
    let parteEntera: number = (numero / 100.0) | 0;
    let resta: any = parseFloat((parteDecimal - parteEntera).toFixed(2));

    let aComparar: any = parseFloat((resta * 100).toFixed(2));

    if (aComparar == 50) {
      return 0;
    } else if (aComparar > 50) {
      var diferencia = aComparar - 50;

      return diferencia;
    } else {
      //Redondear a 000
      var diferencia = 50 - (50 - aComparar);

      return diferencia;
    }
  }
}

export default new ReciboXmlTotalesService();
