import Joi from 'joi'

export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().min(2).max(100).required(),
})

export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

export const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
}).min(1)

export const taskCreateSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional(),
})

export const taskUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  dueDate: Joi.date().iso().optional().allow(null),
}).min(1)

export const taskQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(100).optional(),
})