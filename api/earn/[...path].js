import { proxyLifiRequest } from '../_utils/lifiProxy.js'

export default async function handler(req, res) {
  return proxyLifiRequest(req, res, 'https://earn.li.fi', {
    allowedMethods: ['GET'],
    allowedPathPatterns: [
      /^v1\/earn\/vaults$/,
      /^v1\/earn\/chains$/,
      /^v1\/earn\/protocols$/,
      /^v1\/earn\/portfolio\/0x[a-fA-F0-9]{40}\/positions$/,
    ],
  })
}
