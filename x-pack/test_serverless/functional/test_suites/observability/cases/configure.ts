/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');
  const retry = getService('retry');
  const find = getService('find');

  describe('Configure Case', function () {
    //  Error: timed out waiting for assertRadioGroupValue: Expected the radio group value to equal "close-by-pushing"
    this.tags(['failsOnMKI']);
    before(async () => {
      await svlCommonPage.login();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
      await common.clickAndValidate('configure-case-button', 'case-configure-title');
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await svlCommonPage.forceLogout();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/166469
    describe.skip('Closure options', function () {
      it('defaults the closure option correctly', async () => {
        await cases.common.assertRadioGroupValue('closure-options-radio-group', 'close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectRadioGroupValue('closure-options-radio-group', 'close-by-pushing');
        const toast = await toasts.getToastElement(1);
        expect(await toast.getVisibleText()).to.be('Saved external connection settings');
        await toasts.dismissAllToasts();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/167869
    describe.skip('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        await retry.waitFor('dropdown-connector-no-connector to exist', async () => {
          return await testSubjects.exists('dropdown-connector-no-connector');
        });
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('dropdown-connectors', 'dropdown-connector-add-connector');
        await common.clickAndValidate('dropdown-connector-add-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });

    describe('Custom fields', function () {
      it('adds a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        await common.clickAndValidate('add-custom-field', 'custom-field-flyout');

        await testSubjects.setValue('custom-field-label-input', 'Summary');

        await testSubjects.setCheckbox('text-custom-field-options-wrapper', 'check');

        await testSubjects.click('custom-field-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary\nText');
      });

      it('edits a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const textField = await find.byCssSelector('[data-test-subj*="-custom-field-edit"]');

        await textField.click();

        const input = await testSubjects.find('custom-field-label-input');

        await input.type('!!!');

        await testSubjects.click('custom-field-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary!!!\nText');
      });

      it('deletes a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-custom-field-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-custom-field-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('custom-fields-list');
      });
    });
  });
};
