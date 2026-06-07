#pragma once
#include <string>
using namespace std;

class User
{
private:
    string fname, lname, email, phoneNumber, department, position, userID, password;

    friend int NamingFunction(User &user);
    friend int userID(User &user);
    friend int displayUserInfo(User &user);
    friend int password(User &user, int choice);
    friend int completeProfile(User &user);
    friend string makeString(User &user);
};
