/// <reference types="cypress" />

describe('Agent dashboard flows', () => {
  it('displays agents retrieved from the API', () => {
    cy.visit('/');
    cy.wait('@getAgents');

    cy.contains('AI Agent Dashboard').should('be.visible');
    cy.contains('Aurora').should('be.visible');
    cy.contains('Borealis').should('be.visible');
    cy.contains('Active Agents').parent().should('contain.text', '1');
  });

  it('filters cards via the search input', () => {
    cy.visit('/');
    cy.wait('@getAgents');

    cy.get('input[placeholder="Search agents..."]').type('Aurora');
    cy.contains('Aurora').should('be.visible');
    cy.contains('Borealis').should('not.exist');
  });

  it('navigates to the agent detail page from a card', () => {
    cy.visit('/');
    cy.wait('@getAgents');

    cy.contains('View').first().click();
    cy.url().should('include', '/agents/1');
    cy.contains('Status').should('be.visible');
    cy.contains('Back').click();
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
  });
});
