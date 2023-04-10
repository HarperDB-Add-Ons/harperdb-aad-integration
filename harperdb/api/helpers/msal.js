const msal = require('@azure/msal-node')
const MSAL_CONFIG = {
  auth: {
    clientId: process.env.AAD_CLIENT_ID,
    authority: process.env.AAD_AUTH_URL,
    clientSecret: process.env.AAD_CLIENT_SECRET
  }
}

const REDIRECT_URI = process.env.AAD_REDIRECT_URI

const PERMISSION_MAP = {
  read: 'read',
  write: 'insert'
}

async function validate(request, response, next, hdbCore, logger) {
  /* MSAL USERNAME/PASSWORD AUTH */
  /* GET TOKEN - PARSE ROLES */
  const confidentialClientApplication = new msal.ConfidentialClientApplication({ auth: MSAL_CONFIG.auth })

  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: REDIRECT_URI
  }

  let roles

  try {
    await confidentialClientApplication.acquireTokenByUsernamePassword({
      username: request.body.username,
      password: request.body.password,
      scopes: ['user.read']
    })
    const msalTokenCache = confidentialClientApplication.getTokenCache()
    const cachedAccounts = await msalTokenCache.getAllAccounts()
    roles = cachedAccounts[0].idTokenClaims.roles
  } catch (error) {
    console.log('error', error)
    return response.code(500).send('MSAL Error')
  }
  if (!request.body) {
    request.body = {}
  }

  /* POPULATE USER ROLES IN REQUEST BODY */
  request.body.hdb_user = { role: { permission: {} } }
  roles.forEach((role) => {
    const [schema, table, operation] = role.split('.')
    if (!request.body.hdb_user.role.permission[schema]) {
      request.body.hdb_user.role.permission[schema] = { tables: {} }
    }
    if (!request.body.hdb_user.role.permission[schema].tables[table]) {
      request.body.hdb_user.role.permission[schema].tables[table] = {
        read: false,
        insert: false,
        update: false,
        delete: false,
        attribute_permissions: []
      }
    }
    const permission = PERMISSION_MAP[operation]
    request.body.hdb_user.role.permission[schema].tables[table][permission] = true
  })
}

module.exports = { validate }
