import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = (
    config.get<string>("CORS_ORIGINS") || "http://localhost:3000"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("GreenKey Realty API")
    .setDescription(
      "Backend-for-Frontend for GreenKey Realty (web + mobile). " +
        "Authenticate with phone/email OTP, then use **Authorize** with a Bearer access token.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Paste the accessToken from /v1/auth/otp/verify or /v1/auth/login",
      },
      "JWT",
    )
    .addTag("health", "Service health checks")
    .addTag("auth", "OTP, login, tokens")
    .addTag("users", "Profile, onboarding, saved listings")
    .addTag("agents", "Agent profile (requires active plan)")
    .addTag("billing", "Agent plan, M-Pesa, bank payments")
    .addTag("properties", "Property mirror / listings index")
    .addTag("leads", "Buyer inquiries")
    .addTag("admin", "Admin-only tools")
    .addTag("sanity", "CMS write status")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    useGlobalPrefix: false,
    customSiteTitle: "GreenKey API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const port = Number(config.get("PORT") || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`GreenKey API listening on http://localhost:${port}/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
