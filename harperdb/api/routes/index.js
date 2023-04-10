const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const aadAuth = require('../helpers/msal')

module.exports = async (server, { hdbCore, logger }) => {
  // CREATE A DATA RECORD
  server.route({
    url: '/:schema/:table',
    preValidation: (request, response, next) => aadAuth.validate(request, response, next, hdbCore, logger),
    method: 'POST',
    handler: (request) => {
      const { schema, table } = request.params
      const hasPermission = request.body?.hdb_user?.role?.permission[schema]?.tables[table]?.insert === true

      if (!hasPermission) return response.code(403).send('Forbidden')

      const { records } = request.body
      request.body = {
        operation: 'insert',
        schema,
        table,
        records,
        hdb_user: request.body.hdb_user
      }

      return hdbCore.request(request)
    }
  })

  // READ DATA RECORDS
  server.route({
    url: '/:schema/:table/:hash',
    preValidation: (request, response, next) => aadAuth.validate(request, response, next, hdbCore, logger),
    method: 'POST',
    handler: (request, response) => {
      const { schema, table, hash } = request.params
      const hasPermission = request.body?.hdb_user?.role?.permission[schema]?.tables[table]?.read === true

      if (!hasPermission) return response.code(403).send('Forbidden')

      request.body = {
        operation: 'search_by_hash',
        schema,
        table,
        hash_values: [Number(hash)],
        hdb_user: request.body.hdb_user,
        get_attributes: ['name', 'id']
      }

      return hdbCore.request(request)
    }
  })
}
