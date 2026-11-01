describe('Prueba de Ciclo de Negocio E2E - LuxArs', () => {

  it('Ejecuta el flujo completo: Login -> Selección de Fotógrafo -> Agendamiento de Cita', () => {
    // 1. Acceso y Login
    cy.visit('http://localhost:5173/login');
    
    // Campo de correo / usuario (intenta por tipo de input o por id)
    cy.get('input[type="email"]').type('test_bd@luxars.com'); 
    
    // Campo de contraseña usando su ID exacto (#password)
    cy.get('#password').type('Password123!');
    
    // Botón de envío
    cy.intercept('POST', '**/api/token/').as('loginRequest');
    cy.get('button[type="submit"]').click();

    // 2. Verificación de Token
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.window().its('localStorage').should('have.property', 'access'); // O 'token' según tu localStorage

    // 3. Navegación al catálogo y selección del fotógrafo
    cy.visit('http://localhost:5173/fotografos');
    cy.contains('button', 'Solicitar Reserva').first().click();

    // 4. Completar y enviar la solicitud de agendamiento
    cy.get('#date').type('2026-11-15');
    cy.get('#location').type('Bogotá');
    cy.get('#message').type('Sesión de prueba para validar el agendamiento.');
    cy.intercept('POST', '**/api/bookings/').as('bookingRequest');
    cy.get('form').contains('button', 'Solicitar Reserva').click({ force: true });
    cy.wait('@bookingRequest').its('response.statusCode').should('be.oneOf', [200, 201]);

    // 5. Confirmación de la solicitud agendada
    cy.contains('Solicitud enviada con éxito.').should('be.visible');
  });

});