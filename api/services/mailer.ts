import nodemailer from 'nodemailer'

export type SendMailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

function readEnvBool(value: string | undefined) {
  const v = String(value ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? '')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = readEnvBool(process.env.SMTP_SECURE)

  if (!host || !port || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

export async function sendMail(input: SendMailInput) {
  const from = String(process.env.MAIL_FROM ?? '').trim()
  if (!from) {
    throw new Error('MAIL_FROM_not_configured')
  }

  const transport = createTransport()
  if (!transport) {
    throw new Error('SMTP_not_configured')
  }

  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
}
