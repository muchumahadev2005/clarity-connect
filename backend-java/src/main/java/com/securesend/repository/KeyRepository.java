package com.securesend.repository;

import com.securesend.model.Key;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KeyRepository extends MongoRepository<Key, String> {

    Optional<Key> findByUserId(String userId);

    void deleteByUserId(String userId);
}
