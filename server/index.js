const fs = require('fs');
const http = require("http");
const express = require('express');
const app = express();
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const cars = [{ "id": "1", "name": "Toyota" }, { "id": "2", "name": "BMW" }, { "id": "3", "name": "Volvo" } ];

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cars Express API with Swagger",
      version: "1.0.0",
      description:
        "Example api component for cars",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
      contact: {
        name: "Mika Rinne @ Oracle",
        url: "https://github.com/mikarinneoracle",
        email: "mika.rinne@oracle.com",
      },
    },
    servers: [
      {
        url: "http://127.0.0.1:3000",
      },
    ],
  },
  apis: ["./index.js"],
};

const specs = swaggerJsdoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

/**
 * @swagger
 * tags:
 *   name: Cars API
 *   description: Cars API
 * /cars:
 *   get:
 *     summary: A list of cars
 *     tags: [cars]
 *     responses:
 *       200:
 *         description: A list of cars
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/'
 *             example: { "cars": [ { "id": "1", "name": "Toyota" }, { "id": "2", "name": "BMW" }, { "id": "3", "name": "Volvo" } ] }
 *       500:
 *         description: Some server error
 *
 * /car/{id}:
 *   get:
 *     summary: A single car by id
 *     tags: [car]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: number
 *         required: true
 *         description: Car id
 *     responses:
 *       200:
 *         description: A single car by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/'
 *             example: { "car": { "name": "Toyota" } }
 *       500:
 *         description: Some server error
 */

app.get('/cars', (req, res) => {
  var json = { "cars": cars };
  res.send(JSON.stringify(json));
});

app.get('/car/:id', (req, res) => {
  var car = cars.find(element => element.id == req.params['id']);
  var json ="";
  if(car)
    json = { "car": { "name": car.name } };
  res.send(JSON.stringify(json));
});

app.listen(3000);
