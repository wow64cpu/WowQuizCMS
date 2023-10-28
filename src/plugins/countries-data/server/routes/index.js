module.exports = [
  {
    method: 'GET',
    path: '/generate-countries-quizzes',
    handler: 'mainController.index',
    config: {
      policies: [],
    },
  },
];
