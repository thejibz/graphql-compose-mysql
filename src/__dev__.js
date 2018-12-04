const mysql = require("mysql")
const { ApolloServer } = require("apollo-server")
const exitHook = require('exit-hook')
const { composeWithMysql } = require("./composeWithMysql")()


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

    const employeesSchema = await composeWithMysql({
        graphqlTypeName: "employeeT",
        mysqlClient: connection,
        mysqlTable: "employees",
    })

    const departmentsSchema = await composeWithMysql({
        graphqlTypeName: "departmentsT",
        mysqlClient: connection,
        mysqlTable: "departments",
    })

    const server = new ApolloServer({
        schema: departmentsSchema,
        playground: true,
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })

    exitHook(() => {
        console.log('Exiting');
        // release connection
        connection.end()
    });
}

main()
