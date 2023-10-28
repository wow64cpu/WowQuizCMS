/*
 *
 * HomePage
 *
 */

import React, {useCallback, useState} from 'react';
// import PropTypes from 'prop-types';
import {useFetchClient} from '@strapi/helper-plugin';
import {HeaderLayout, Button} from '@strapi/design-system';
import pluginId from '../../pluginId';
import {Magic} from "@strapi/icons";

const HomePage = () => {
  const fetchClient = useFetchClient();

  const [inUpdate, setInUpdate] = useState(false)

  const handleCountriesCountriesQuizzes = useCallback(async () => {
    setInUpdate(true);
    try {
      const res = await fetchClient.get(`/${pluginId}/generate-countries-quizzes`)
      console.log(res);
    } catch (error) {
      console.log(error);
    }
    setInUpdate(false);
  }, []);

  return (
    <div>
      <HeaderLayout
        id="title"
        title={pluginId}
        primaryAction={
          <Button
            startIcon={<Magic />}
            variant="secondary"
            onClick={handleCountriesCountriesQuizzes}
            disabled={inUpdate}
          >
            Generate countries quizzes
          </Button>
        }
      />
    </div>
  );
};

export default HomePage;
