const { schemaComposer } = require("graphql-compose")
const mysql = require("mysql")
const { ApolloServer } = require("apollo-server")
const composeWithMysql = require("./composeWithMysql")

/* For introspection
query {
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}
*/

async function main() {
    
    const connection = mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: "secret",
        database: "employees",
    })

    // open connection
    connection.connect()

    const gqlType = await composeWithMysql({
        graphqlTypeName: "employees",
        mysqlClient: connection,
        mysqlTable: "employees",
    })

    // Release connection
    connection.end()

    schemaComposer.Query.addFields({
        employees: {
            type: gqlType,
            resolve: () => "fake",
        },
    })

    const server = new ApolloServer({
        schema: schemaComposer.buildSchema(),
        playground: true,
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()
