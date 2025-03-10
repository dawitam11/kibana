/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export interface MonacoError {
  message: string;
  startColumn: number;
  startLineNumber: number;
  endColumn: number;
  endLineNumber: number;
  severity: monaco.MarkerSeverity;
}

export const useDebounceWithOptions = (
  fn: Function,
  { skipFirstRender }: { skipFirstRender: boolean } = { skipFirstRender: false },
  ms?: number | undefined,
  deps?: React.DependencyList | undefined
) => {
  const isFirstRender = useRef(true);
  const newDeps = [...(deps || []), isFirstRender];

  return useDebounce(
    () => {
      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      return fn();
    },
    ms,
    newDeps
  );
};

export const parseWarning = (warning: string): MonacoError[] => {
  if (warning.includes('Line')) {
    const splitByLine = warning.split('Line');
    splitByLine.shift();
    return splitByLine.map((item) => {
      const [lineNumber, startPosition, warningMessage] = item.split(':');
      const [trimmedMessage] = warningMessage.split('"');
      // initialize the length to 10 in case no error word found
      let errorLength = 10;
      const [_, wordWithError] = trimmedMessage.split('[');
      if (wordWithError) {
        errorLength = wordWithError.length - 1;
      }
      return {
        message: trimmedMessage.trimStart(),
        startColumn: Number(startPosition),
        startLineNumber: Number(lineNumber),
        endColumn: Number(startPosition) + errorLength,
        endLineNumber: Number(lineNumber),
        severity: monaco.MarkerSeverity.Error,
      };
    });
  } else {
    // unknown warning message
    return [
      {
        message: warning,
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Error,
      },
    ];
  }
};

export const parseErrors = (errors: Error[], code: string): MonacoError[] => {
  return errors.map((error) => {
    if (error.message.includes('line')) {
      const text = error.message.split('line')[1];
      const [lineNumber, startPosition, errorMessage] = text.split(':');
      // initialize the length to 10 in case no error word found
      let errorLength = 10;
      const [_, wordWithError] = errorMessage.split('[');
      if (wordWithError) {
        errorLength = wordWithError.length - 1;
      }
      return {
        message: errorMessage,
        startColumn: Number(startPosition),
        startLineNumber: Number(lineNumber),
        endColumn: Number(startPosition) + errorLength,
        endLineNumber: Number(lineNumber),
        severity: monaco.MarkerSeverity.Error,
      };
    } else {
      // unknown error message
      return {
        message: error.message,
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Error,
      };
    }
  });
};

export const getDocumentationSections = async (language: string) => {
  const groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];
  if (language === 'sql') {
    const {
      comparisonOperators,
      logicalOperators,
      mathOperators,
      initialSection,
      aggregateFunctions,
    } = await import('./sql_documentation_sections');
    groups.push({
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.howItWorks', {
        defaultMessage: 'How it works',
      }),
      items: [],
    });
    groups.push(comparisonOperators, logicalOperators, mathOperators, aggregateFunctions);
    return {
      groups,
      initialSection,
    };
  }
  if (language === 'esql') {
    const {
      sourceCommands,
      processingCommands,
      initialSection,
      functions,
      aggregationFunctions,
      operators,
    } = await import('./esql_documentation_sections');
    groups.push({
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.esql', {
        defaultMessage: 'ES|QL',
      }),
      items: [],
    });
    groups.push(sourceCommands, processingCommands, functions, aggregationFunctions, operators);
    return {
      groups,
      initialSection,
    };
  }
};

export const getInlineEditorText = (queryString: string, isMultiLine: boolean) => {
  return isMultiLine ? queryString.replace(/\r?\n|\r/g, ' ').replace(/  +/g, ' ') : queryString;
};

export const getWrappedInPipesCode = (code: string, isWrapped: boolean): string => {
  const pipes = code?.split('|');
  const codeNoLines = pipes?.map((pipe) => {
    return pipe.replaceAll('\n', '').trim();
  });
  return codeNoLines.join(isWrapped ? ' | ' : '\n| ');
};

export const getIndicesForAutocomplete = async (dataViews: DataViewsPublicPluginStart) => {
  const indices = await dataViews.getIndices({
    showAllIndices: false,
    pattern: '*',
    isRollupIndex: () => false,
  });
  return indices.filter((index) => !index.name.startsWith('.')).map((i) => i.name);
};
