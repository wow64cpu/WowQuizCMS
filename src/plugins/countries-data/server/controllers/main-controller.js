'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    const res = await strapi
      .plugin('countries-data')
      .service('mainService')
      .generateCountriesQuizzes();
    if (res instanceof Promise) {
      ctx.body = await res
    } else {
      ctx.body = res
    }
  },
});
