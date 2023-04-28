require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Jwt = require('@hapi/jwt');
const path = require('path');

const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

const CacheService = require('./services/redis/CacheService');

const collaborations = require('./api/collaborations');
const CollaborationsService = require('./services/postgres/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');

const _exports = require('./api/exports');
const ProducerService = require('./services/rabbitmq/ProducerService');
const ExportsValidator = require('./validator/exports');

const notes = require('./api/notes');
const NotesService = require('./services/postgres/NotesService');
const NotesValidator = require('./validator/notes');

const uploads = require('./api/uploads');
const StorageService = require('./services/storage/StorageService');
const UploadsValidator = require('./validator/uploads');

const users = require('./api/users');
const UsersService = require('./services/postgres/UsersService');
const UsersValidator = require('./validator/users');

const init = async () => {
	const cacheService = new CacheService();
	const authenticationsService = new AuthenticationsService();
	const collaborationsService = new CollaborationsService(cacheService);
	const notesService = new NotesService(collaborationsService, cacheService);
	const storageService = new StorageService(path.resolve(__dirname, 'api/uploads/file/images'));
	const usersService = new UsersService();

	const server = Hapi.server({
		port: process.env.PORT,
		host: process.env.HOST,
		routes: {
			cors: {
				origin: ['*'],
			},
		},
	});

	await server.register([
		{
			plugin: Jwt,
		},
		{
			plugin: Inert,
		},
	]);

	server.auth.strategy('notesapp_jwt', 'jwt', {
		keys: process.env.ACCESS_TOKEN_KEY,
		verify: {
			aud: false,
			iss: false,
			sub: false,
			maxAgeSec: process.env.ACCESS_TOKEN_AGE,
		},
		validate: (artifacts) => ({
			isValid: true,
			credentials: {
				id: artifacts.decoded.payload.id,
			},
		}),
	});

	await server.register([
		{
			plugin: authentications,
			options: {
				authenticationsService,
				usersService,
				tokenManager: TokenManager,
				validator: AuthenticationsValidator,
			},
		},
		{
			plugin: collaborations,
			options: {
				collaborationsService,
				notesService,
				validator: CollaborationsValidator,
			},
		},
		{
			plugin: _exports,
			options: {
				service: ProducerService,
				validator: ExportsValidator,
			},
		},
		{
			plugin: notes,
			options: {
				service: notesService,
				validator: NotesValidator
			},
		},
		{
			plugin: uploads,
			options: {
				service: storageService,
				validator: UploadsValidator,
			},
		},
		{
			plugin: users,
			options: {
				service: usersService,
				validator: UsersValidator,
			},
		},
	]);

	await server.start();
	console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
