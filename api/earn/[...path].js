import { proxyLifiRequest } from '../_utils/lifiProxy.js'

export default async function handler(req, res) {
  return proxyLifiRequest(req, res, 'https://earn.li.fi')
}
