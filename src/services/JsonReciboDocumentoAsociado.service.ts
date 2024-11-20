import constanteService from './constants.service';
import stringUtilService from './StringUtil.service';
import { XmlgenConfig } from './type.interface.';

class JsonReciboDocumentoAsociadoService {
  public generateDocumentosAsociados(params: any, data: any, config: XmlgenConfig) {
    const jsonResult = new Array();
    if (Array.isArray(data.documentoAsociado)) {
      for (let i = 0; i < data.documentoAsociado.length; i++) {
        const daResult = this.generateDocumentoAsociado(params, data.documentoAsociado[i], config);
        jsonResult.push(daResult);
      }
    } else {
      const daResult = this.generateDocumentoAsociado(params, data.documentoAsociado, config);
      jsonResult.push(daResult);
    }
    return jsonResult;
  }

  /**
   *
   * @param params
   * @param doumentoAsociado
   * @param options
   */
  public generateDocumentoAsociado(params: any, doumentoAsociado: any, config: XmlgenConfig) {
    const jsonResult: any = {
      iTipDocAso: doumentoAsociado['formato'],
      dDesTipDocAso: constanteService.tiposDocumentosAsociados.filter(
        (td) => td.codigo === doumentoAsociado['formato'],
      )[0]['descripcion'],
    };

    if (doumentoAsociado['formato'] == 1) {
      //H002 = Electronico
      if (doumentoAsociado['cdc']) {
        jsonResult['dCdCDERef'] = doumentoAsociado['cdc'];
      }
    }

    if (doumentoAsociado['formato'] == 2) {
      //H002 = Impreso
      if (doumentoAsociado['timbrado']) {
        jsonResult['dNTimDI'] = doumentoAsociado['timbrado'];
        /*} else {
          throw new Error(
            'Debe especificar el Timbrado del Documento impreso Asociado en data.documentoAsociado.timbrado',
          );*/
      }
      if (doumentoAsociado['establecimiento']) {
        jsonResult['dEstDocAso'] = stringUtilService.leftZero(doumentoAsociado['establecimiento'] + '', 3);
        /*} else {
          throw new Error(
            'Debe especificar el Establecimiento del Documento impreso Asociado en data.documentoAsociado.establecimiento',
          );*/
      }
      if (doumentoAsociado['punto']) {
        jsonResult['dPExpDocAso'] = stringUtilService.leftZero(doumentoAsociado['punto'] + '', 3);
        /*} else {
          throw new Error('Debe especificar el Punto del Documento impreso Asociado en data.documentoAsociado.punto');*/
      }
      if (doumentoAsociado['numero']) {
        jsonResult['dNumDocAso'] = stringUtilService.leftZero(doumentoAsociado['numero'] + '', 7);
        /*} else {
          throw new Error('Debe especificar el Número del Documento impreso Asociado en data.documentoAsociado.numero');*/
      }
      if (doumentoAsociado['serie']) {
        jsonResult['dSerDocAso'] = doumentoAsociado['serie'];
        /*} else {
          throw new Error('Debe especificar el Número del Documento impreso Asociado en data.documentoAsociado.numero');*/
      }
      if (doumentoAsociado['tipoDocumentoImpreso']) {
        jsonResult['iTipoDocAso'] = doumentoAsociado['tipoDocumentoImpreso'];
        jsonResult['dDTipoDocAso'] = constanteService.tiposDocumentosImpresos.filter(
          (td) => td.codigo === doumentoAsociado['tipoDocumentoImpreso'],
        )[0]['descripcion'];
        /*} else {
          throw new Error(
            'Debe especificar el Tipo del Documento Impreso Asociado en data.documentoAsociado.tipoDocumentoImpreso',
          );*/
      }
      if (doumentoAsociado['fecha']) {
        /*if ((data['fecha'] + '').length != 10) {
            throw new Error(
              'La Fecha del Documento impreso Asociado en data.documentoAsociado.fecha debe tener una longitud de 10 caracteres',
            );
          }*/
        jsonResult['dFecEmiDI'] = doumentoAsociado['fecha'];
        /*} else {
          throw new Error('Debe especificar la Fecha del Documento impreso Asociado en data.documentoAsociado.fecha');*/
      }

      if (doumentoAsociado && doumentoAsociado['numeroRetencion'] && doumentoAsociado['numeroRetencion'].length >= 15) {
        jsonResult['dNumComRet'] = doumentoAsociado['numeroRetencion'].substring(0, 15);
      }
      if (
        doumentoAsociado &&
        doumentoAsociado['resolucionCreditoFiscal'] &&
        doumentoAsociado['resolucionCreditoFiscal'].length >= 15
      ) {
        jsonResult['dNumResCF'] = doumentoAsociado['resolucionCreditoFiscal'].substring(0, 15);
      }
    }
    let montoNumerico = +doumentoAsociado['monto'];
    jsonResult['monto'] = parseFloat(montoNumerico.toFixed(config.decimals));

    jsonResult['montoRetencionIva'] = 0;
    jsonResult['montoRetencionRenta'] = 0;

    if (typeof doumentoAsociado['montoRetencionIva'] != 'undefined') {
      let montoRetencionIva = +doumentoAsociado['montoRetencionIva'];
      jsonResult['montoRetencionIva'] = parseFloat(montoRetencionIva.toFixed(config.decimals));
    }

    if (typeof doumentoAsociado['montoRetencionRenta'] != 'undefined') {
      let montoRetencionRenta = +doumentoAsociado['montoRetencionRenta'];
      jsonResult['montoRetencionRenta'] = parseFloat(montoRetencionRenta.toFixed(config.decimals));
    }

    return jsonResult;
  }
}

export default new JsonReciboDocumentoAsociadoService();
