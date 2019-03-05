const { ApolloServer } = require('apollo-server')
const composeWithMysql = require("./composeWithMysql").composeWithMysql

composeWithMysql({
    mysqlConfig: {
        //debug: ['ComQueryPacket'],
        //connectionLimit: 100,
        host: "localhost",
        port: 3306,
        user: "root",
        password: "secret",
        database: "employees",
    },
}).then(employeesSchema => {
    const server = new ApolloServer({
        schema: employeesSchema,
        playground: true,
        debug: true
    })

    server.listen({ port: 4000 }).then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
})