describe('Pruebas de Integridad de Base de Datos - LuxArs API', () => {
  
  // URL base de tu backend en Django
  const baseUrl = 'http://127.0.0.1:8000/api'; 
  const testUserSuffix = `${Date.now()}_${Cypress._.random(0, 9999)}`;

  it('Verifica inserción correcta de datos (201 Created)', () => {
    cy.request({
      method: 'POST',
      url: `${baseUrl}/users/`, // Ajusta al endpoint real de tu app 'users'
      body: {
        username: `test_integridad_bd_${testUserSuffix}`,
        email: `test_bd_${testUserSuffix}@luxars.com`,
        password: 'Password123!'
      }
    }).then((response) => {
      // Comprueba el código HTTP y los datos devueltos
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
    });
  });

  it('Rechaza payload incompleto protegiendo la integridad (400 Bad Request)', () => {
    cy.request({
      method: 'POST',
      url: `${baseUrl}/users/`,
      failOnStatusCode: false, // Evita que la prueba falle al recibir un error HTTP intencional
      body: {
        // Enviar body vacío o sin campos requeridos para forzar el rechazo
      }
    }).then((response) => {
      expect(response.status).to.eq(400);
    });
  });

});