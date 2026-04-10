import { proxyLifiRequest } from '../_utils/lifiProxy.js'

export default async function handler(req, res) {
  return proxyLifiRequest(req, res, 'https://li.quest', {
    allowedMethods: ['GET'],
    upstreamPath: 'v1/status',
  })
}
