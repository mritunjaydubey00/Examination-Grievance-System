#include <iostream>
#include <string>
#include "User.h"
#include "localStorage.h"
using namespace std;

int NamingFunction(User &user)
{
    cout << "Enter your first name: ";
    getline(cin, user.fname);
    cout << "Enter your Last name: ";
    getline(cin, user.lname);
    return 0;
}

int userID(User &user)
{
    cout << "Enter your new ID: ";
    getline(cin, user.userID);
    return 0;
}

int displayUserInfo(User &user)
{
    cout << "First Name: " << user.fname << endl;
    cout << "Last Name: " << user.lname << endl;
    cout << "Email: " << user.email << endl;
    cout << "Phone Number: " << user.phoneNumber << endl;
    cout << "Department: " << user.department << endl;
    cout << "Position: " << user.position << endl;
    return 0;
}

int password(User &user, int choice)
{
    switch (choice)
    {
    case 1:
    {
        string tempPass1, tempPass2;
        cout << "Enter Password: ";
        getline(cin, tempPass1);
        cout << "Confirm Password: ";
        getline(cin, tempPass2);
        if (tempPass1 == tempPass2)
        {
            user.password = tempPass1;
            cout << "Password set successfully!" << endl;
        }
        else
        {
            cout << "Passwords do not match. Please try again." << endl;
        }
        return 0;
    }
    case 2:
    {
        {
            string current, newpass;
            cout << "Current Password: ";
            getline(cin, current);
            cout << "Enter your new password: ";
            getline(cin, newpass);
            user.password = newpass;
        }
        return 0;
    }
    }
}

int completeProfile(User &user)
{
    cout << "Enter your email: ";
    getline(cin, user.email);
    cout << "Enter your phone number: ";
    getline(cin, user.phoneNumber);
    cout << "Enter your department: ";
    getline(cin, user.department);
    cout << "Enter your position: ";
    getline(cin, user.position);
    return 0;
}

string makeString(User &user)
{
    string dataRow = user.fname + "," + user.lname + "," + user.email + "," + user.phoneNumber + "," + user.department + "," + user.position + "," + user.userID + "," + user.password;
    return dataRow;
}

int makeUser(User &user)
{
    NamingFunction(user);
    userID(user);
    password(user, 1);
    completeProfile(user);
    displayUserInfo(user);
    return 0;
}