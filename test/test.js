const mysql = require("mysql")
const { composeWithMysql } = require("../src/composeWithMysql.mjs")

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "secret",
    database: "employees",
})

connection.connect()

composeWithMysql({
    graphqlTypeName: "employees",
    mysqlClient: connection,
    mysqlTable: "employees",
})

// Mix-in for Data Access Methods and SQL Autogenerating Methods
// mysqlUtilities.upgrade(connection)

// // Mix-in for Introspection Methods
// mysqlUtilities.introspection(connection)

// Do something using utilities
// connection.queryRow("SELECT * FROM employees where first_name=?", ["Mary"], (err, row) => {
//     console.dir({ queryRow: row })
// })

// connection.fields("employees", (err, data) => {
//     console.dir({ fields: data })
// })

// Release connection
connection.end()
