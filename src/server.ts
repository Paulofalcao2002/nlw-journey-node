import fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./lib/prisma";
import { createTrip } from "./routes/create-trip";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { confirmTrip } from "./routes/confirm-trip";
import { confirmParticipant } from "./routes/confirm-participant";
import { createActivity } from "./routes/create-activity";
import { getActivities } from "./routes/get-activities";
import { createLink } from "./routes/create-link";
import { getLinks } from "./routes/get-links";
import { getParticipants } from "./routes/get-participants";
import { createInvite } from "./routes/create-invite";
import { updateTrip } from "./routes/update-trip";
import { getTripDetails } from "./routes/get-trip-details";
import { getParticipant } from "./routes/get-participant";
import { errorHandler } from "./error-handler";
import { env } from "./env";

const app = fastify();

app.register(cors, {
  origin: "*",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler(errorHandler);

app.register(getTripDetails);
app.register(createTrip);
app.register(updateTrip);
app.register(confirmTrip);

app.register(createInvite);
app.register(getParticipants);
app.register(getParticipant);
app.register(confirmParticipant);

app.register(createActivity);
app.register(getActivities);

app.register(createLink);
app.register(getLinks);

app.get("/list", async () => {
  const trips = await prisma.trip.findMany();

  return trips;
});

app.listen({ port: env.PORT }).then(() => {
  console.log("Server running");
});
