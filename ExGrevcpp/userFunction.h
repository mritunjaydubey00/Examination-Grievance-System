#pragma once
#include <string>
#include "User.h"
using namespace std;

int NamingFunction(User &user);
int userID(User &user);
int displayUserInfo(User &user);
int password(User &user, int choice);
int completeProfile(User &user);
string makeString(User &user);
int makeUser(User &user);