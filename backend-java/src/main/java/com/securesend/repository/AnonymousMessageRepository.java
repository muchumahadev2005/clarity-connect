package com.securesend.repository;

import com.securesend.model.AnonymousMessage;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AnonymousMessageRepository extends MongoRepository<AnonymousMessage, String> {

    @Query("{ '$or': [ { 'to': { '$in': ?0 } }, { 'senderAlias': { '$in': ?1 } } ] }")
    List<AnonymousMessage> findInboxMessages(Collection<String> recipientEmails, Collection<String> senderAliases, Sort sort);
}
