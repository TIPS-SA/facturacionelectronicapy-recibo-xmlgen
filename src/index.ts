import deService from './services/reciboXmlMain.service';
import { XmlgenConfig } from './services/type.interface.';

class DE {
  generateReciboXML = (params: any, data: any, config?: XmlgenConfig): Promise<any> => {
    return deService.generateReciboXMLDE(params, data, config);
  };
}

export default new DE();
