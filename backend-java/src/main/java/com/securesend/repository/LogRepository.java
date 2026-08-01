package com.securesend.repository;

import com.securesend.model.Log;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogRepository extends MongoRepository<Log, String> {

    List<Log> findByMessageId(String messageId);
}
