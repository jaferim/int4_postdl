import type { Core } from '@strapi/strapi';

const config: Core.Config.Api = {
  rest: {
    //The canvas loads the whole graph in one un-paginated `?populate=*` call (web/src/lib/load.js), so the default page must be big enough to return every facet/edge at once. Bump both limits well above the dataset size.
    defaultLimit: 1000,
    maxLimit: 5000,
    withCount: true,
  },
};

export default config;
