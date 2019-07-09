import { buildTestContainer } from './serviceBuilders';
import tokens from '../../contracts/tokens';

export default async function setupAllowances(tokenList = []) {
  const container = buildTestContainer({ cdp: true, token: true });
  const tokenService = container.service('token');
  const cdpService = container.service('cdp');
  await tokenService.manager().authenticate();

  for (let symbol of tokenList) {
    const token = tokenService.getToken(tokens[symbol.toUpperCase()]);
    await token.approve(cdpService._tubContract().address, '0');
  }
}
