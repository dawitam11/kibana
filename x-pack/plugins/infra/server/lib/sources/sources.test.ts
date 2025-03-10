/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { MetricsDataClient } from '@kbn/metrics-data-access-plugin/server';
import { InfraConfig } from '../../types';
import { infraSourceConfigurationSavedObjectName } from './saved_object_type';
import { InfraSources } from './sources';

describe('the InfraSources lib', () => {
  describe('getSourceConfiguration method', () => {
    test('returns a source configuration if it exists', async () => {
      const sourcesLib = new InfraSources({
        config: createMockStaticConfiguration({}),
        metricsClient: createMockMetricsDataClient('METRIC_ALIAS'),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        updated_at: '2000-01-01T00:00:00.000Z',
        type: infraSourceConfigurationSavedObjectName,
        attributes: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'log_index_pattern_0' },
        },
        references: [
          {
            id: 'LOG_INDEX_PATTERN',
            name: 'log_index_pattern_0',
            type: 'index-pattern',
          },
        ],
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'LOG_INDEX_PATTERN' },
        },
      });
    });

    test('adds missing attributes from the static configuration to a source configuration', async () => {
      const sourcesLib = new InfraSources({
        config: createMockStaticConfiguration({
          default: {
            metricAlias: 'METRIC_ALIAS',
            logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
          },
        }),
        metricsClient: createMockMetricsDataClient('METRIC_ALIAS'),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        type: infraSourceConfigurationSavedObjectName,
        updated_at: '2000-01-01T00:00:00.000Z',
        attributes: {},
        references: [],
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: 'METRIC_ALIAS',
          logIndices: { type: 'index_pattern', indexPatternId: 'LOG_ALIAS' },
        },
      });
    });

    test('adds missing attributes from the default configuration to a source configuration', async () => {
      const sourcesLib = new InfraSources({
        config: createMockStaticConfiguration({}),
        metricsClient: createMockMetricsDataClient(),
      });

      const request: any = createRequestContext({
        id: 'TEST_ID',
        version: 'foo',
        type: infraSourceConfigurationSavedObjectName,
        updated_at: '2000-01-01T00:00:00.000Z',
        attributes: {},
        references: [],
      });

      expect(
        await sourcesLib.getSourceConfiguration(request.core.savedObjects.client, 'TEST_ID')
      ).toMatchObject({
        id: 'TEST_ID',
        version: 'foo',
        updatedAt: 946684800000,
        configuration: {
          metricAlias: expect.any(String),
          logIndices: expect.any(Object),
        },
      });
    });
  });
});

const createMockStaticConfiguration = (sources: any): InfraConfig => ({
  alerting: {
    inventory_threshold: {
      group_by_page_size: 10000,
    },
    metric_threshold: {
      group_by_page_size: 10000,
    },
  },
  inventory: {
    compositeSize: 2000,
  },
  featureFlags: {
    customThresholdAlertsEnabled: false,
    logsUIEnabled: true,
    metricsExplorerEnabled: true,
    osqueryEnabled: true,
    inventoryThresholdAlertRuleEnabled: true,
    metricThresholdAlertRuleEnabled: true,
    logThresholdAlertRuleEnabled: true,
  },
  sources,
  enabled: true,
});

const createMockMetricsDataClient = (metricAlias: string = 'metrics-*,metricbeat-*') =>
  ({
    getMetricIndices: jest.fn().mockResolvedValue(metricAlias),
    updateMetricIndices: jest.fn(),
  } as unknown as MetricsDataClient);

const createRequestContext = (savedObject?: SavedObject<unknown>) => {
  return {
    core: {
      savedObjects: {
        client: {
          async get() {
            return savedObject;
          },
          errors: {
            isNotFoundError() {
              return typeof savedObject === 'undefined';
            },
          },
        },
      },
    },
  };
};
