module.exports = {
  // ...
  'countries-data': {
    enabled: true,
    resolve: './src/plugins/countries-data'
  },
  graphql: {
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      playgroundAlways: false,
      depthLimit: 16,
      amountLimit: 100,
      apolloServer: {
        tracing: false,
      },
    },
  },
  // ...
};
