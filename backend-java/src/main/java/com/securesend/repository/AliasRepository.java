package com.securesend.repository;

import com.securesend.model.Alias;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AliasRepository extends MongoRepository<Alias, String> {

    Optional<Alias> findByRealEmailIgnoreCaseAndIsActiveTrueAndExpiresAtGreaterThan(String realEmail, Instant now);

    Optional<Alias> findByAliasIgnoreCase(String alias);

    Optional<Alias> findByAliasIgnoreCaseAndIsActiveTrueAndExpiresAtGreaterThan(String alias, Instant now);

    List<Alias> findByRealEmailIgnoreCase(String realEmail);

    List<Alias> findByRealEmailIgnoreCaseAndIsActiveTrue(String realEmail);
}
