import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from "nodemailer";

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips/:tripId/invites",
    {
      schema: {
        body: z.object({
          email: z.string().email(),
        }),
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params;
      const { email } = request.body;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        throw new Error("Trip not found!");
      }

      const participant = await prisma.participant.create({
        data: {
          email,
          trip_id: tripId,
        },
      });

      const { starts_at, ends_at, destination } = trip;

      const formattedStartDay = dayjs(starts_at).format("LL");
      const formattedEndDay = dayjs(ends_at).format("LL");

      const mail = await getMailClient();

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

      return { id: participant.id };
    }
  );
}
