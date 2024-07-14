import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from "nodemailer";
import { ClientError } from "../errors/client-error";

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/trips/:tripId/confirm",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId } = request.params;

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: {
            where: {
              is_owner: false,
            },
          },
        },
      });

      if (!trip) {
        throw new ClientError("Trip not found!");
      }

      if (trip.is_confirmed) {
        // return reply.redirect(`localhost:3000/trips/${tripId}`);
        return "Redirect to trip page, you are confirmed";
      }

      await prisma.trip.update({
        where: { id: tripId },
        data: { is_confirmed: true },
      });

      const { starts_at, ends_at, participants, destination } = trip;

      const formattedStartDay = dayjs(starts_at).format("LL");
      const formattedEndDay = dayjs(ends_at).format("LL");

      const mail = await getMailClient();

      await Promise.all(
        participants.map(async (participant) => {
          const confirmationLink = `http://localhost:3333/participants/${participant.id}/confirm`;
          const message = await mail.sendMail({
            from: {
              name: "plann.er team",
              address: "support@planner.com",
            },
            to: {
              name: participant.name ?? "",
              address: participant.email,
            },
            subject: `${destination} trip at ${formattedStartDay} to ${formattedEndDay}`,
            html: `<p>Your new trip has been booked</p>
          <a href="${confirmationLink}">Confirm trip</a>
          `,
          });

          console.log(nodemailer.getTestMessageUrl(message));
        })
      );

      // return reply.redirect(`localhost:3000/trips/${tripId}`);
      return "Redirect to trip page, now confirmed";
    }
  );
}
