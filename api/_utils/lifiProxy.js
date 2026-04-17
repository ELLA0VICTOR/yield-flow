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

function resolvePathSegments(pathQuery) {
  if (Array.isArray(pathQuery)) {
    return pathQuery
  }

  if (pathQuery) {
    return [pathQuery]
  }

  return []
}

function assertAllowedMethod(method, allowedMethods) {
  const normalizedMethod = String(method || 'GET').toUpperCase()

  if (!allowedMethods.includes(normalizedMethod)) {
    const error = new Error('Method not allowed')
    error.statusCode = 405
    throw error
  }
}

function assertAllowedPath(pathname, allowedPathPatterns) {
  const isAllowed = allowedPathPatterns.some((pattern) => pattern.test(pathname))

  if (!isAllowed) {
    const error = new Error('Path not allowed')
    error.statusCode = 403
    throw error
  }
}

export async function proxyLifiRequest(req, res, upstreamBase, options = {}) {
  const {
    allowedMethods = ['GET'],
    allowedPathPatterns = [],
    upstreamPath = '',
    mapQuery = null,
  } = options

  try {
    assertAllowedMethod(req.method, allowedMethods)

    if (!process.env.LIFI_API_KEY) {
      const error = new Error('LI.FI API key is missing on the server')
      error.statusCode = 500
      throw error
    }

    const normalizedPath = upstreamPath || resolvePathSegments(req.query.path).join('/')

    if (allowedPathPatterns.length > 0) {
      assertAllowedPath(normalizedPath, allowedPathPatterns)
    }

    const normalizedBase = upstreamBase.endsWith('/') ? upstreamBase : `${upstreamBase}/`
    const upstreamUrl = new URL(normalizedPath, normalizedBase)
    appendSearchParams(upstreamUrl, mapQuery ? mapQuery(req.query) : req.query)

    const headers = {
      'x-lifi-api-key': process.env.LIFI_API_KEY,
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
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Proxy request failed',
    })
  }
}
