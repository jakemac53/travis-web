/* global Travis */
import $ from 'jquery';
import TravisRoute from 'travis/routes/basic';
import config from 'travis/config/environment';
import BuildFaviconMixin from 'travis/mixins/build-favicon';
import { inject as service } from '@ember/service';
import {
  bindKeyboardShortcuts,
  unbindKeyboardShortcuts
} from 'ember-keyboard-shortcuts';

export default TravisRoute.extend(BuildFaviconMixin, {
  auth: service(),
  features: service(),
  featureFlags: service(),
  flashes: service(),
  metrics: service(),
  repositories: service(),
  router: service(),

  needsAuth: false,

  init() {
    this.auth.afterSignOut(() => {
      this.afterSignOut();
    });

    if (config.metricsAdapters.length > 0) {
      const { metrics, router } = this;
      router.on('routeDidChange', () => {
        try {
          const { currentURL: page } = router;
          metrics.trackPage({ page });
        } catch (err) {
        }
      });
    }

    return this._super(...arguments);
  },

  renderTemplate: function () {
    if (this.get('features.proVersion')) {
      $('body').addClass('pro');
    }
    return this._super(...arguments);
  },

  model() {
    if (this.get('auth.signedIn')) {
      return this.get('featureFlags.fetchTask').perform();
    }
  },

  activate() {
    this.setupRepoSubscriptions();
    bindKeyboardShortcuts(this);
  },

  deactivate() {
    unbindKeyboardShortcuts(this);
  },

  // We send pusher updates through user channels now and this means that if a
  // user is not a collaborator of a repo or a user is not signed in, we need to
  // use repo channels for updates for each repo. This method ensures that a
  // visitor is subscribed to all of the public repos in the store as long as
  // they're not a collaborator. It also sets up an observer to subscribe to any
  // new repo that enters the store.
  setupRepoSubscriptions() {
    this.store.filter('repo', null,
      (repo) => !repo.get('private') && !repo.get('isCurrentUserACollaborator'),
      ['private', 'isCurrentUserACollaborator']
    ).then((repos) => {
      repos.forEach(repo => this.subscribeToRepo(repo));
      repos.addArrayObserver(this, {
        willChange: 'reposWillChange',
        didChange: 'reposDidChange'
      });
    });
  },

  reposWillChange(array, start, removedCount, addedCount) {
    let removedRepos = array.slice(start, start + removedCount);
    return removedRepos.forEach(repo => this.unsubscribeFromRepo(repo));
  },

  reposDidChange(array, start, removedCount, addedCount) {
    let addedRepos = array.slice(start, start + addedCount);
    return addedRepos.forEach(repo => this.subscribeToRepo(repo));
  },

  unsubscribeFromRepo: function (repo) {
    if (this.pusher && repo) {
      this.pusher.unsubscribe(`repo-${repo.get('id')}`);
    }
  },

  subscribeToRepo: function (repo) {
    if (this.pusher) {
      this.pusher.subscribe(`repo-${repo.get('id')}`);
    }
  },

  title(titleParts) {
    if (titleParts.length) {
      titleParts = titleParts.reverse();
      titleParts.push('Travis CI');
      return titleParts.join(' - ');
    } else {
      return config.defaultTitle;
    }
  },

  keyboardShortcuts: {
    'up': {
      action: 'disableTailing',
      preventDefault: false
    },
    'down': {
      action: 'disableTailing',
      preventDefault: false
    }
  },

  actions: {
    signIn(runAfterSignIn = true) {
      let authParams = this.modelFor('auth');
      this.auth.signIn(null, authParams);
      if (runAfterSignIn) {
        this.afterSignIn();
      }
    },

    signOut() {
      this.auth.signOut();
    },

    disableTailing() {
      Travis.tailing.stop();
    },

    redirectToGettingStarted() {
      // keep as a no-op as this bubbles from other routes
    },

    error(error) {
      if (error === 'needs-auth') {
        this.set('auth.redirected', true);
        let currentURL = new URL(window.location.href);

        return this.transitionTo('auth', { queryParams: { redirectUri: currentURL.href }});
      } else {
        return true;
      }
    },
  },

  afterSignIn() {
    this.flashes.clear();
    let transition = this.get('auth.afterSignInTransition');
    if (transition) {
      this.set('auth.afterSignInTransition', null);
      return transition.retry();
    } else {
      return this.transitionTo('index');
    }
  },

  afterSignOut() {
    this.featureFlags.reset();
    this.set('repositories.accessible', []);
    this.setDefault();
    if (this.get('features.enterpriseVersion')) {
      return this.transitionTo('auth');
    }
    return this.transitionTo('index');
  },
});
