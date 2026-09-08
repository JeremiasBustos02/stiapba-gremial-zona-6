FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace/backend

COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY backend/src ./src
RUN mvn -B -ntp package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /workspace/backend/target/document-management-0.0.1-SNAPSHOT.jar /app/app.jar
COPY docs/pdf-templates/Permiso-Gremial-Bruna.pdf /app/seed/Permiso-Gremial-Bruna.pdf
COPY docs/pdf-templates/Permiso-Gremial-Bruna-ACROFORM.pdf /app/seed/Permiso-Gremial-Bruna-ACROFORM.pdf

USER spring
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
