import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from "nodemailer";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips",
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const {
        starts_at,
        ends_at,
        owner_email,
        owner_name,
        destination,
        emails_to_invite,
      } = request.body;

      const trip = await prisma.trip.create({
        data: {
          starts_at,
          ends_at,
          destination,
          participants: {
            createMany: {
              data: [
                {
                  name: owner_name,
                  email: owner_email,
                  is_owner: true,
                  is_confirmed: true,
                },
                ...emails_to_invite.map((email) => ({
                  email,
                })),
              ],
            },
          },
        },
      });

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new ClientError("Invalid trip start date!");
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new ClientError("Invalida trip end date!");
      }

      const formattedStartDay = dayjs(starts_at).format("LL");
      const formattedEndDay = dayjs(ends_at).format("LL");

      const mail = await getMailClient();

      const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`;

      const message = await mail.sendMail({
        from: {
          name: "plann.er team",
          address: "support@planner.com",
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: `${destination} trip at ${formattedStartDay} to ${formattedEndDay}`,
        html: `<p>Your new trip has been booked</p>
        <a href="${confirmationLink}">Confirm trip</a>
        `,
      });

      console.log(nodemailer.getTestMessageUrl(message));

      return { id: trip.id };
    }
  );
}
