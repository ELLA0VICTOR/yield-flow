function appendSearchParams(url, query) {
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'path' || value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)))
      return
    }

    url.searchParams.set(key, String(value))
  })
}

export async function proxyLifiRequest(req, res, upstreamBase) {
  const pathSegments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
      ? [req.query.path]
      : []

  const normalizedBase = upstreamBase.endsWith('/') ? upstreamBase : `${upstreamBase}/`
  const upstreamUrl = new URL(pathSegments.join('/'), normalizedBase)
  appendSearchParams(upstreamUrl, req.query)

  const headers = {}

  if (process.env.LIFI_API_KEY) {
    headers['x-lifi-api-key'] = process.env.LIFI_API_KEY
  }

  if (req.headers.accept) {
    headers.accept = req.headers.accept
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method || 'GET',
    headers,
  })

  const contentType = upstreamResponse.headers.get('content-type')
  const payload = await upstreamResponse.text()

  if (contentType) {
    res.setHeader('content-type', contentType)
  }

  res.status(upstreamResponse.status).send(payload)
}
