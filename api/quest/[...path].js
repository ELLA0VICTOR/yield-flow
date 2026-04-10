import { proxyLifiRequest } from '../_utils/lifiProxy.js'

export default async function handler(req, res) {
  return proxyLifiRequest(req, res, 'https://li.quest', {
    allowedMethods: ['GET'],
    allowedPathPatterns: [
      /^v1\/chains$/,
      /^v1\/quote$/,
      /^v1\/status$/,
    ],
  })
}
