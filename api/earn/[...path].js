import { proxyLifiRequest } from '../_utils/lifiProxy.js'

export default async function handler(req, res) {
  return proxyLifiRequest(req, res, 'https://earn.li.fi', {
    allowedMethods: ['GET'],
    allowedPathPatterns: [
      /^v1\/vaults$/,
      /^v1\/chains$/,
      /^v1\/protocols$/,
      /^v1\/portfolio\/0x[a-fA-F0-9]{40}\/positions$/,
    ],
  })
}
