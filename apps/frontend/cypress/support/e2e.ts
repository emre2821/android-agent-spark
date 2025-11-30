import './commands';

beforeEach(() => {
  cy.intercept('GET', 'http://localhost:3001/agents', { fixture: 'agents.json' }).as('getAgents');
});
