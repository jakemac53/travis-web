import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import profilePage from 'travis/tests/pages/profile';

module('Integration | Component | billing-information', function (hooks) {
  setupRenderingTest(hooks);
  hooks.beforeEach(function () {
    const plans = [{
      id: 1,
      name: 'A',
      builds: 5,
      price: 20000,
      annual: false
    }, {
      id: 1,
      name: 'B',
      builds: 10,
      price: 30000,
      annual: true
    }];
    this.plans = plans;

    const newSubscription = {
      billingInfo: {
        firstName: '',
        lastName: '',
        companyName: '',
        billingEmail: '',
        street: '',
        billingSuite: '',
        billingCity: '',
        bllingZip: '',
        country: '',
        vatId: ''
      }
    };

    this['actions'] = {
      next: () => { },
      back: () => { },
      goToFirstStep: () => { }
    };

    this.setProperties({
      displayedPlans: plans,
      selectedPlan: plans[0],
      showAnnual: false,
      newSubscription
    });
  });

  test('it renders billing information form correctly', async function (assert) {
    await render(hbs`
      <Billing::Information 
        @selectedPlan={{selectedPlan}} 
        @displayedPlans={{displayedPlans}} 
        @showAnnual={{showAnnual}}
        @newSubscription={{newSubscription}}
        @next={{action 'next'}}
        @back={{action 'back'}}
        @goToFirstStep={{action 'goToFirstStep'}}
      />`
    );

    assert.dom('[data-test-contact-details-title]').hasText('Contact details');
    assert.dom('[data-test-billing-details-title]').hasText('Billing address');
    assert.equal(profilePage.billing.selectedPlanOverview.heading.text, 'summary');
    assert.equal(profilePage.billing.selectedPlanOverview.name.text, `${this.plans[0].name} plan`);
    assert.equal(profilePage.billing.selectedPlanOverview.jobs.text, `${this.plans[0].builds} concurrent jobs`);
    assert.equal(profilePage.billing.selectedPlanOverview.price.text, `$${this.plans[0].price / 100}`);
    assert.equal(profilePage.billing.period.text, '/month');
    assert.equal(profilePage.billing.selectedPlanOverview.changePlan.text, 'Change plan');

    assert.dom('input').isVisible({ count: 9 });
    assert.dom('.ember-power-select-trigger').isVisible({ count: 1 });
  });

  test('it renders billing information form correctly', async function (assert) {
    assert.expect(1);

    this['actions']['back'] = () => {
      assert.ok(true);
    };

    await render(hbs`
      <Billing::Information 
        @selectedPlan={{selectedPlan}} 
        @displayedPlans={{displayedPlans}} 
        @showAnnual={{showAnnual}}
        @newSubscription={{newSubscription}}
        @next={{action 'next'}}
        @back={{action 'back'}}
        @goToFirstStep={{action 'goToFirstStep'}}
      />`
    );

    await profilePage.billing.billingForm.backToPlans.click();
  });
});
