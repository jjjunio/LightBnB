const properties = require('./json/properties.json');
const users = require('./json/users.json');
//node-postgres connection
const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = function(email) {
  return pool.query(`
    SELECT * FROM users
    WHERE users.email = $1
  `, [email])
  .then(res => res.rows[0]);
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(`
    SELECT * FROM users
    WHERE users.id = $1
  `, [id])
  .then(res => res.rows[0]);
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser =  function(user) {
  const { name, email, password } = user;
    return pool.query(`
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [name, email, password])
    .then(res => res.rows[0]);
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
    SELECT 
      properties.*,
      reservations.*,
      avg(rating) AS average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id 
    WHERE reservations.guest_id = $1
    AND reservations.end_date < now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;
  `, [guest_id, limit])
  .then(res => res.rows);
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

//search properties according to seacrh options filled by user  
const getAllProperties = function(options, limit = 10) {
  const {
    city,
    owner_id,
    minimum_price_per_night,
    maximum_price_per_night,
    minimum_rating
  } = options;
  
  const queryParams = [];
  
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // if city search field completed 
  if (city) {
    queryParams.push(`%${city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  };
  // if owner search field completed 
  if (owner_id) {
    queryParams.push(owner_id);
    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length} `;
    } else {
      queryString += `AND owner_id = $${queryParams.length} `;
    }
  };
  // if min price and max price search field completed  
  if (minimum_price_per_night && maximum_price_per_night) {
    queryParams.push(minimum_price_per_night);
    if (queryParams.length === 1) {
      queryString += `WHERE cost_per_night >= $${queryParams.length} `;
      queryParams.push(maximum_price_per_night);
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length} `;
      queryParams.push(maximum_price_per_night);
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    }
  };

  queryString += `
  GROUP BY properties.id
  `;
  // if min proprty rating filed completed  
  if (minimum_rating) {
    queryParams.push(minimum_rating)
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  };

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  //check overall query string
  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams)
  .then(res => res.rows);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const {
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms,
    country,
    street,
    city,
    province,
    post_code
  } = property;

  return pool.query(`
  INSERT INTO properties 
      (owner_id, 
      title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night, 
      parking_spaces, 
      number_of_bathrooms, 
      number_of_bedrooms,
      country,
      street, 
      city, 
      province, 
      post_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING * ;
    `, [
       owner_id,
       title,
       description,
       thumbnail_photo_url,
       cover_photo_url,
       cost_per_night,
       parking_spaces,
       number_of_bathrooms,
       number_of_bedrooms,
       country,
       street,
       city,
       province,
       post_code
       ])
  .then(res => res.rows[0]);
};
exports.addProperty = addProperty;
