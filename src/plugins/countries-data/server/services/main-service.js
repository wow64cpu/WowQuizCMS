'use strict';

const mime = require('mime');
const fs = require('fs');
const axios = require('axios').default;
const url = require('url');
const path = require('path');
const UserAgent = require('user-agents');

const locales = {
  default: {
    flagsQuiz: {
      label: 'Flags',
      tag: 'flags-quiz',
      iconUrl: 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/flag/materialsymbolsrounded/flag_grad200fill1_48px.svg'
    },
    coatsOfArmsQuiz: {
      label: 'Coats of arms',
      tag: 'coats_of_arms-quiz',
      iconUrl: 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/security/materialsymbolsrounded/security_48px.svg'
    },
    locale: 'en'
  },
  additional: [
    {
      flagsQuiz: {
        label: 'Флаги',
        tag: 'flags-quiz',
      },
      coatsOfArmsQuiz: {
        label: 'Гербы',
        tag: 'coats_of_arms-quiz',
      },
      locale: 'ru'
    }
  ]
};

const allLocales =       [
  locales.default,
  ...locales.additional
];

const localesMap = {
  '2-3': {
    ru: 'rus'
  },
  '3-2': {
    rus: 'ru'
  }
};

const quizUid = 'api::quiz.quiz';
const questionUid = 'api::question.question';
const answerUid = 'api::answer.answer';

module.exports = ({ strapi }) => ({
  async generateCountriesQuizzes() {
    let updateStatus = false;

    try {
      const res = await axios.get('https://restcountries.com/v3.1/all', {
        headers: {
          'User-Agent': (new UserAgent()).toString(),
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
        }
      });

      const filePath = `${strapi.dirs.app.root}/.tmp/countries.json`;

      await strapi.fs.writeAppFile(filePath, JSON.stringify(res.data));

      const answers = createLocalizedArraysObject();

      const flagsQuestions = createLocalizedArraysObject();
      const coatsOfArmsQuestions = createLocalizedArraysObject();

      const flagsQuizzesIcon = await axios.get(locales.default.flagsQuiz.iconUrl);
      const coatsOfArmsQuizzesIcon = await axios.get(locales.default.coatsOfArmsQuiz.iconUrl);

      const flagsQuizzesIconFile = await createOrUpdateFile(strapi, getFileName(locales.default.flagsQuiz.iconUrl), flagsQuizzesIcon.data);
      const coatsOfArmsQuizzesIconFile = await createOrUpdateFile(strapi, getFileName(locales.default.coatsOfArmsQuiz.iconUrl), coatsOfArmsQuizzesIcon.data);

      const localizedFlagsQuizzes = await Promise.all(
        allLocales.map((locale) => creteOrUpdateEntry(strapi, quizUid, {
          label: locale.flagsQuiz.label,
          tag: locale.flagsQuiz.tag,
          icon: {
            id: flagsQuizzesIconFile.id
          }
        }, locale.locale))
      );
      await syncLocalizations(strapi, quizUid, localizedFlagsQuizzes);

      const localizedCoatsOfArmsQuizzes = await Promise.all(
        allLocales.map((locale) => creteOrUpdateEntry(strapi, quizUid, {
          label: locale.coatsOfArmsQuiz.label,
          tag: locale.coatsOfArmsQuiz.tag,
          icon: {
            id: coatsOfArmsQuizzesIconFile.id
          }
        }, locale.locale))
      );
      await syncLocalizations(strapi, quizUid, localizedCoatsOfArmsQuizzes);

      await Promise.all(
        res.data.map((country) => {
          const name = {
            [locales.default.locale]: country.name.common,
            ...locales.additional.reduce((acc, locale) => {
              acc[locale.locale] = country.translations[localesMap['2-3'][locale.locale]].common;
              return acc;
            }, {})
          };

          const flag = country.flag;
          const coatOfArmsSvgImageUrl = country.coatOfArms.svg;

          return new Promise(async (resolve) => {
            const localizedAnswers = await Promise.all(
              allLocales.map((locale) => creteOrUpdateEntry(strapi, answerUid, {
                label: name[locale.locale],
                tag: `quiz-answer-${country.cca2}`
              }, locale.locale))
            );

            const localizedAnswersObject = localizedAnswers.reduce((acc, localizedAnswer) => {
              answers[localizedAnswer.locale].push(localizedAnswer);
              acc[localizedAnswer.locale] = localizedAnswer;
              return acc;
            }, {});

            await syncLocalizations(strapi, answerUid, localizedAnswers);

            const localizedFlagsQuestions = await Promise.all(
              allLocales.map((locale) => creteOrUpdateEntry(strapi, questionUid, {
                label: flag,
                tag: `flags-quiz-question-${country.cca2}`,
                answer: localizedAnswersObject[locale.locale]
              }, locale.locale))
            );

            const localizedFlagsQuestionsObject = localizedFlagsQuestions.reduce((acc, localizedQuestion) => {
              flagsQuestions[localizedQuestion.locale].push(localizedQuestion);
              acc[localizedQuestion.locale] = localizedQuestion;
              return acc;
            }, {});

            await syncLocalizations(strapi, questionUid, localizedFlagsQuestions);

            if (coatOfArmsSvgImageUrl !== undefined) {
              const res = await axios.get(coatOfArmsSvgImageUrl);

              const fileName = `coat_of_arms_${country.cca2}.svg`;

              const coatOfArmsFile = await createOrUpdateFile(strapi, fileName, res.data);

              const localizedCoatOfArmsQuestions = await Promise.all(
                allLocales.map((locale) => creteOrUpdateEntry(strapi, questionUid, {
                  tag: `coat-of-arms-quiz-question-${country.cca2}`,
                  answer: localizedAnswersObject[locale.locale],
                  image: {
                    id: coatOfArmsFile.id
                  }
                }, locale.locale))
              );

              const localizedCoatOfArmsQuestionsObject = localizedCoatOfArmsQuestions.reduce((acc, localizedQuestion) => {
                coatsOfArmsQuestions[localizedQuestion.locale].push(localizedQuestion);
                acc[localizedQuestion.locale] = localizedQuestion;
                return acc;
              }, {});

              await syncLocalizations(strapi, questionUid, localizedCoatOfArmsQuestions);
            }

            resolve()
          });
        })
      );

      await syncQuizzesWithQuestions(strapi, quizUid, localizedFlagsQuizzes, flagsQuestions);
      await syncQuizzesWithQuestions(strapi, quizUid, localizedCoatsOfArmsQuizzes, coatsOfArmsQuestions);

      updateStatus = true;
    } catch (e) {
      console.error(e);
      updateStatus = false;
    }

    return updateStatus;
  },
});

const getFileName = (link) => {
  const parsed = url.parse(link);
  return path.basename(parsed.pathname);
}

const createOrUpdateFile = async (strapi, fileName, data) => new Promise(async (resolve) => {
  const filePath = `${strapi.dirs.app.root}/.tmp/${fileName}`;
  await strapi.fs.writeAppFile(filePath, data);

  const stats = fs.statSync(filePath);

  const existenceFiles = await strapi.plugins.upload.services.upload.findMany({
    filters: {
      $and: [
        {
          name: fileName,
        },
      ],
    },
  });

  if (existenceFiles.length > 0) {
    const updatedFile = await strapi.plugins.upload.services.upload.replace(existenceFiles[0].id, {
      data: {},
      file: {
        path: filePath,
        name: fileName,
        type: mime.getType(filePath),
        size: stats.size,
      }
    });
    resolve(updatedFile);
  } else {
    const uploadedFiles = await strapi.plugins.upload.services.upload.upload({
      data: {}, // mandatory declare the data(can be empty), otherwise it will give you an undefined error. This parameters will be used to relate the file with a collection.
      files: {
        path: filePath,
        name: fileName,
        type: mime.getType(filePath),
        size: stats.size,
      },
    });
    resolve(uploadedFiles[0]);
  }
});

const syncQuizzesWithQuestions = async (strapi, uid, localizedQuizzes, localizedQuestions) => Promise.all(
  localizedQuizzes.map((localizedFlagsQuiz) => strapi.query(uid).update({
    where: {
      id: localizedFlagsQuiz.id
    },
    data: {
      questions: localizedQuestions[localizedFlagsQuiz.locale]
    }
  }))
);

const createLocalizedArraysObject = (locales = allLocales) => locales.reduce((acc, locale) => {
  acc[locale.locale] = [];
  return acc;
}, {});

const creteOrUpdateEntry = (strapi, uid, data, locale) => new Promise(async (resolve) => {
  let entry = (await strapi.entityService.findMany(uid, {
    filters: {
      $and: [
        {
          tag: data.tag,
        },
      ],
    },
    locale
  }))[0];

  if (entry instanceof Object) {
    entry = await strapi.entityService.update(uid, entry.id, {
      data,
    });
  } else {
    entry = await createEntry(strapi, uid, data, locale);
  }

  resolve(entry);
});

const createEntry = (strapi, uid, data, locale) => strapi.entityService.create(uid, {
  data: {
    ...data,
    locale
  }
});

const syncLocalizations = (strapi, uid, entries) => new Promise(async (resolve) => {
  const localizations = await Promise.all(
    entries.slice(1).map((entry) => strapi.query(uid).update({
      where: {
        id: entry.id // localized entry id
      },
      data: {
        localizations: [entries[0]] // main entry
      },
    }))
  );
  await strapi.query(uid).update({
    where: {
      id: entries[0].id
    },
    data: {
      localizations
    }
  });
  resolve();
});
