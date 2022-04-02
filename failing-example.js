const {ApolloServer, gql} = require('apollo-server');
const {buildSubgraphSchema} = require('@apollo/subgraph');
const {makeExecutableSchema} = require("@graphql-tools/schema");
const {HttpLink} = require("@apollo/client/core");
const fetch = require("node-fetch");
const {linkToExecutor} = require("@graphql-tools/links");
const {introspectSchema, wrapSchema} = require('@graphql-tools/wrap');
const {getResolversFromSchema} = require("@graphql-tools/utils");

const typeDefs = gql`
    type Structure {
        structure: String!
    }
    type NestedStructure {
        nested: Structure!
    }
    type Query {
        test: NestedStructure!
    }
`;

(async function () {
    const server1 = new ApolloServer({
        schema: makeExecutableSchema(
            {
                typeDefs,
                resolvers: {
                    Query: {
                        test: () => {
                            return {
                                nested: {
                                    structure: "here"
                                }
                            }
                        }
                    },
                }
            }
        )
    });
    server1.listen({port: 4000}).then(({url}) => {
        console.log(`🚀Server 1 ready at ${url}`)
        const executor = linkToExecutor(new HttpLink({uri: 'http://localhost:4000', fetch}));
        (async function () {
            const server2 = new ApolloServer({
                schema: buildSubgraphSchema(
                    [
                        await (async () => {
                            const schema = wrapSchema({
                                schema: await introspectSchema(executor),
                                executor
                            })
                            const resolvers = getResolversFromSchema(schema)
                            return {resolvers, typeDefs}
                        })()
                    ]
                ),
            })
            server2.listen({port: 4001}).then(({url}) => {
                console.log(`🚀Server 2 ready at ${url}`)
            })
        })();
    });
})();
