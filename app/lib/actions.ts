'use server'

import { z } from 'zod'
import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

// Define the form schema using zod
const FormSchema = z.object({
	id: z.string(),
	customerId: z.string({
		invalid_type_error: 'Please select a customer.',
	}),
	amount: z.coerce
		.number()
		.gt(0, { message: 'Please enter an amount greater than $0.' }),
	status: z.enum(['pending', 'paid'], {
		invalid_type_error: 'Please select an invoice status.',
	}),
	date: z.string(),
})

export type State = {
	errors?: {
		customerId?: string[]
		amount?: string[]
		status?: string[]
	}
	message?: string | null
}

export async function authenticate(
	prevState: string | undefined,
	formData: FormData
) {
	try {
		await signIn('credentials', formData)
	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case 'CredentialsSignin':
					return 'Invalid credentials.'
				default:
					return 'Something went wrong.'
			}
		}
		throw error
	}
}

const CreateInvoice = FormSchema.omit({ id: true, date: true })
const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(prevState: State, formData: FormData) {
	// Parse the form data using the CreateInvoice schema
	const validatedFields = CreateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	})

	// If form validation fails, return errors early. Otherwise, continue.
	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: 'Missing Fields. Failed to Create Invoice.',
		}
	}

	// Prepare data for insertion into the database
	const { customerId, amount, status } = validatedFields.data

	// Convert the amount to cents and get the current date
	const amountInCents = Math.round(amount * 100)
	const date = new Date().toISOString().split('T')[0]

	try {
		// Insert the invoice into the database
		await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `
	} catch (error) {
		return {
			message: 'Database error: failed to create invoice',
		}
	}

	revalidatePath('/dashboard/invoices')
	redirect('/dashboard/invoices')
}

export async function updateInvoice(
	id: string,
	prevState: State,
	formData: FormData
) {
	// Parse the form data using the UpdateInvoice schema
	const validatedFields = UpdateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	})

	// If form validation fails, return errors early. Otherwise, continue.
	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: 'Missing Fields. Failed to Update Invoice.',
		}
	}

	// Prepare data for insertion into the database
	const { customerId, amount, status } = validatedFields.data
	const amountInCents = Math.round(amount * 100)

	try {
		await sql`
		UPDATE invoices
		SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
		WHERE id = ${id}
	`
	} catch (error) {
		return {
			message: 'Database error: failed to update invoice',
		}
	}

	revalidatePath('/dashboard/invoices')
	redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
	try {
		await sql`DELETE FROM invoices WHERE id = ${id}`

		revalidatePath('/dashboard/invoices')
		return {
			message: 'Deleted invoice',
		}
	} catch (error) {
		return {
			message: 'Database error: failed to delete invoice',
		}
	}
}
