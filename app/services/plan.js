import Service, { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import config from 'travis/config/environment';
import { task } from 'ember-concurrency';
import { not, filterBy, reads } from '@ember/object/computed';

export default Service.extend({
  accounts: service(),
  store: service(),

  showAnnual: false,
  availablePlans: config.plans,
  showMonthly: not('showAnnual'),
  defaultPlans: filterBy('availablePlans', 'isDefault'),
  defaultPlanName: reads('defaultPlans.firstObject.name'),
  plans: reads('fetchPlans.lastSuccessful.value'),

  fetchPlans: task(function* (account) {
    if (account.isOrganization) {
      return yield this.store.findAll('plan', {
        adapterOptions: { organizationId: account.id }
      }) || [];
    } else {
      return yield this.store.findAll('plan') || [];
    }
  }).keepLatest(),

  nonGithubPlans: computed('plans.@each.{id,name,annual,builds}', function () {
    const plans = this.plans || [];
    return plans.filter(plan => plan.id && !plan.id.startsWith('github'));
  }),

  monthlyPlans: computed('nonGithubPlans.@each.{name,annual,builds}', function () {
    const nonGithubPlans = this.nonGithubPlans || [];
    const filteredMonthlyPlans = nonGithubPlans.filter(plan => !plan.annual && plan.builds);
    return filteredMonthlyPlans.sort((a, b) => a.builds - b.builds);
  }),

  annualPlans: computed('nonGithubPlans.@each.{name,annual,builds}', function () {
    const nonGithubPlans = this.nonGithubPlans || [];
    const filteredAnnualPlans = nonGithubPlans.filter(plan => plan.annual && plan.builds);
    return filteredAnnualPlans.sort((a, b) => a.builds - b.builds);
  }),

  displayedPlans: computed('showAnnual', 'monthlyPlans.[]', 'annualPlans.[]', function () {
    return this.showAnnual ? this.annualPlans : this.monthlyPlans;
  }),

  selectedPlan: computed('displayedPlans.[].name', 'defaultPlanName', function () {
    return this.displayedPlans.findBy('name', this.defaultPlanName);
  }),

  togglePlanPeriod() {
    this.toggleProperty('showAnnual');
  },
});
